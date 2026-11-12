import { Router } from "express";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "../db/prisma";
import { encryptField, decryptField, lookupHash } from "../encryption/envelope";
import { log } from "../services/audit";
import { ok } from "../lib/respond";

const router = Router();

function parseDatasets(xml: string) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const doc = parser.parse(xml);
  const datasets = doc?.data?.dataset;
  const dsList = Array.isArray(datasets) ? datasets : datasets ? [datasets] : [];
  const result = { basedata: [] as any[], groupsextension: [] as any[] };
  for (const ds of dsList) {
    const tag = ds.tagname || "basedata";
    const objs = ds?.object;
    if (!objs) continue;
    const arr = (Array.isArray(objs) ? objs : [objs]).map((obj: any) => {
      const fields: Record<string, string> = {};
      const f = obj.field || [];
      (Array.isArray(f) ? f : [f]).forEach((ff: any) => { if (ff?.fieldname) fields[ff.fieldname] = ff.value ?? ""; });
      return fields;
    });
    if (tag === "groupsextension") result.groupsextension.push(...arr);
    else result.basedata.push(...arr);
  }
  return result;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{8})$/);
  if (m) return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function firstEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.replace(/\s+/g, " ").split(/[;,]/).map(s => s.trim().toLowerCase()).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return parts[0] || null;
}

function normalizeDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`);
}

router.post("/preview", async (req, res) => {
  const files = req.body.files || [];
  const preview: any[] = [];
  const changes: any[] = [];
  const schools = await prisma.school.findMany({ include: { type: true } });
  const schoolBySid = new Map(schools.map(s => [s.sid, s]));
  const flagDefs = await prisma.flagDefinition.findMany();
  const flagLabel = new Map(flagDefs.map(f => [f.dataId, f.label]));
  const groupFlags = await prisma.groupFlagAssignment.findMany({ include: { flag: true } });
  for (const f of files) {
    let xml = "";
    try { xml = Buffer.from(f.xmlBase64, "base64").toString("utf8"); } catch {}
    const ds = xml ? parseDatasets(xml) : { basedata: [], groupsextension: [] };
    for (const r of ds.basedata) {
      const email = firstEmail(r.EMAIL);
      const sid = r.SNR || "";
      const soid = sid.slice(-2);
      const sgid = sid.slice(0, 3);
      const school = schoolBySid.get(sid);
      const isPupil = r.ENTITYTYPE === "s" || /sus/i.test(f.name);
      const row: any = {
        lkid: r.LKGREIZ_GRID, name: r.NNAME, firstName: r.VNAME, email,
        klasse: r.KL || "", stufe: r.STUFE || "",
        sid, soid, sgid, snr: sid,
        username: r.USERNAME || r.BENUTZER || "",
        dateOfBirth: r.GEBDAT || r.GEBURTSDATUM || r.GEBURT || "",
        schoolName: school?.name || r.SCHULNAME || "",
        schoolType: school?.type?.label || r.SCHULTYP || "",
        roles: isPupil ? "Schüler" : "Lehrer",
        active: r.ENTLASSEN !== "J", terminated: r.ENTLASSEN === "J",
        flags: (() => {
          const ids = r.IOT === "J" ? ["iot"] : [];
          for (const g of groupFlags) {
            if (g.roleId && !ids.includes(g.flag.dataId)) ids.push(g.flag.dataId);
          }
          return ids.map(id => flagLabel.get(id) || id).join(", ");
        })(),
        selected: true,
      };
      preview.push(row);
      if (r.LKGREIZ_GRID) {
        const existing = await prisma.person.findUnique({ where: { lkidHash: lookupHash(r.LKGREIZ_GRID) }, include: { classes: true } });
        if (existing) {
          const oldEmail = await decryptField(existing.email) || "";
          const oldClass = existing.classes[0]?.classKey?.split("-").slice(1).join("-") || "";
          if (email && oldEmail && email !== oldEmail) changes.push({ lkid: r.LKGREIZ_GRID, field: "E-Mail", old: oldEmail, new: email });
          if (r.KL && oldClass && r.KL !== oldClass) changes.push({ lkid: r.LKGREIZ_GRID, field: "Klasse", old: oldClass, new: r.KL });
          if (r.STUFE && existing.stufe && existing.stufe !== r.STUFE) changes.push({ lkid: r.LKGREIZ_GRID, field: "Stufe", old: existing.stufe, new: r.STUFE });
          if (existing.systemEmail) row.systemEmail = await decryptField(existing.systemEmail) || "";
        }
      }
    }
  }
  const newCount = preview.filter(p => p.lkid && !changes.some(c => c.lkid === p.lkid)).length;
  if (!changes.length && newCount === preview.length && preview.every(p => p.lkid)) {
    const existing = await prisma.person.count({ where: { lkid: { in: preview.map(p => p.lkid).filter(Boolean) } } });
    if (existing === preview.length) return ok(res, { preview, changes, unchanged: true, message: "Keine Änderungen — Import nicht nötig" });
  }
  ok(res, { preview, changes, total: preview.length });
});

router.post("/commit", async (req, res) => {
  const { files, selectedLkids } = req.body;
  const selected = new Set(selectedLkids || []);
  let created = 0, updated = 0;
  const schoolBySgid = new Map((await prisma.school.findMany()).map(s => [s.sgid, s]));
  const flagDefs = await prisma.flagDefinition.findMany();
  const flagLabel = new Map(flagDefs.map(f => [f.dataId, f.label]));
  const groupFlags = await prisma.groupFlagAssignment.findMany({ include: { flag: true } });
  const roleMap = new Map((await prisma.roleDefinition.findMany()).map(r => [r.dataId, r]));
  const existingUsernames = new Set((await prisma.person.findMany({ select: { username: true } })).map(p => p.username));

  for (const f of files || []) {
    let xml = "";
    try { xml = Buffer.from(f.xmlBase64, "base64").toString("utf8"); } catch {}
    const ds = xml ? parseDatasets(xml) : { basedata: [], groupsextension: [] };
    const isPupilFile = /sus/i.test(f.name);
    for (const r of ds.basedata) {
      if (selected.size && !selected.has(r.LKGREIZ_GRID)) continue;
      const lkid = r.LKGREIZ_GRID;
      if (!lkid || !r.NNAME) continue;
      const school = schoolBySgid.get(r.SNR);
      if (!school) continue;
      const email = firstEmail(r.EMAIL);
      const existing = await prisma.person.findUnique({ where: { lkidHash: lookupHash(lkid) } });
      const isPupil = isPupilFile || r.ENTITYTYPE === "s";
      if (!existing) {
        const clean = (s: string) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]/g, "").slice(0, 3);
        let username = clean(r.VNAME || "") + clean(r.NNAME);
        let n = 1;
        while (existingUsernames.has(username)) { username = clean(r.VNAME || "") + clean(r.NNAME) + n; n++; }
        existingUsernames.add(username);
        const person = await prisma.person.create({
          data: {
            lkid: (await encryptField(lkid))!, lkidHash: lookupHash(lkid),
            name: (await encryptField(r.NNAME))!, firstName: (await encryptField(r.VNAME || ""))!,
            dateOfBirth: parseDate(r.GEBDAT || r.GEBURTSDATUM || r.GEBURT || r.DOB),
            email: await encryptField(email),
            username: (await encryptField(username))!, usernameHash: lookupHash(username),
            stufe: r.STUFE || null,
            appleId: await encryptField(`${username}@appleid.ds-greiz.de`.toLowerCase()),
            systemEmail: await encryptField(`${username}@${school.soid}.schulen-greiz.de`.toLowerCase()),
            schools: { create: { schoolId: school.id } },
            classes: r.KL ? { create: { schoolId: school.id, classKey: `${school.sid}-${r.KL}` } } : undefined,
          },
        });
        const role = roleMap.get(isPupil ? "Schueler" : "Lehrer");
        if (role) await prisma.personRole.create({ data: { personId: person.id, roleId: role.id } });
        created++;
      } else {
        const updates: any = {};
        if (email) updates.email = await encryptField(email);
        if (r.STUFE) updates.stufe = r.STUFE;
        if (Object.keys(updates).length) {
          await prisma.person.update({ where: { id: existing.id }, data: updates });
          updated++;
        }
      }
    }
  }
  await log("import", "batch", "commit", (req as any).userId, { created, updated });
  ok(res, { created, updated });
});

export default router;