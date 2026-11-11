import { Router } from "express";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "../db/prisma";
import { encryptField } from "../encryption/envelope";
import { z } from "zod";
import { logger } from "../services/logger";

const router = Router();

const multiImportSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    type: z.enum(["SuS", "LuL", "unknown"]).optional(),
    xmlBase64: z.string(),
  })).min(1),
});

function parseDatasets(xml: string): { basedata: any[]; groupsextension: any[] } {
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
      (Array.isArray(f) ? f : [f]).forEach((ff: any) => {
        if (ff?.fieldname) fields[ff.fieldname] = ff.value ?? "";
      });
      return fields;
    });
    if (tag === "groupsextension") result.groupsextension.push(...arr);
    else result.basedata.push(...arr);
  }
  return result;
}

function normalizeDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`);
}

function firstEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/[;,]/).map(s => s.trim().toLowerCase()).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return parts[0] || null;
}

function isIotActive(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v !== "n" && v !== "nein" && v !== "false" && v !== "0" && v !== "";
}

function typeFromSid(sid: string): string {
  const map: Record<string, string> = { "21": "Grundschule", "22": "Regelschule", "23": "Gymnasium", "24": "Berufsschule", "27": "Förderschule" };
  return map[sid.slice(0, 2)] || "Unbekannt";
}

function generateUsername(first: string, last: string, existing: Set<string>): string {
  const clean = (s: string) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z]/g, "").slice(0, 3);
  let base = clean(first) + clean(last);
  if (base.length < 3) base = (base + "xxx").slice(0, 6);
  let candidate = base;
  let n = 1;
  while (existing.has(candidate)) { candidate = base + n; n++; }
  existing.add(candidate);
  return candidate;
}

function decodeFiles(files: { name: string; type?: string; xmlBase64: string }[]) {
  return files.map(f => {
    let xml = "";
    try { xml = Buffer.from(f.xmlBase64, "base64").toString("utf8"); } catch { /* ignore */ }
    const ds = xml ? parseDatasets(xml) : { basedata: [], groupsextension: [] };
    return { ...f, xml, ...ds };
  });
}

router.post("/preview", async (req, res) => {
  const parsed = multiImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: parsed.error.issues });

  const decoded = decodeFiles(parsed.data.files);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[import:preview]", decoded.map(f => ({ name: f.name, type: f.type, personnel: f.basedata.length, classes: f.groupsextension.length })));
  }

  const issues: any[] = [];
  const preview: any[] = [];
  const snrSeen = new Map<string, string>();
  const schoolCache = new Map<string, any>();

  for (const file of decoded) {
    for (let i = 0; i < file.basedata.length; i++) {
      const r = file.basedata[i];
      const rowIssues: string[] = [];
      if (!r.LKGREIZ_GRID) rowIssues.push("LKGREIZ_GRID fehlt");
      if (!r.NNAME) rowIssues.push("NNAME fehlt");
      if (!r.VNAME) rowIssues.push("VNAME fehlt");
      if (!r.SNR) rowIssues.push("SNR fehlt");
      if (r.GEBDAT && !normalizeDate(r.GEBDAT)) rowIssues.push("GEBDAT ungültig");
      if (r.SNR && !snrSeen.has(r.SNR)) snrSeen.set(r.SNR, r.LONG0 || "");

      let school = schoolCache.get(r.SNR);
      if (!school && r.SNR) {
        school = await prisma.school.findFirst({ where: { sgid: r.SNR } });
        if (school) schoolCache.set(r.SNR, school);
      }

      if (rowIssues.length) issues.push({ source: file.name, row: i + 1, lkid: r.LKGREIZ_GRID, messages: rowIssues });
      preview.push({
        sid: school?.sid || "",
        sgid: r.SNR || "",
        soid: school?.soid || (school?.sid ? school.sid.slice(-2) : ""),
        schoolName: school?.name || r.LONG0 || "",
        schoolType: school?.schoolType || (school?.sid ? typeFromSid(school.sid) : ""),
        klasse: r.KL || "",
        stufe: r.STUFE || "",
        lkid: r.LKGREIZ_GRID,
        name: r.NNAME,
        firstName: r.VNAME,
        dateOfBirth: r.GEBDAT,
        username: "",
        appleId: "",
        email: firstEmail(r.EMAIL) || "",
        systemEmail: "",
        flags: isIotActive(r.IOT) ? ["iot"] : [],
        issues: rowIssues,
      });
    }
  }

  const existingSgid = new Set((await prisma.school.findMany({ select: { sgid: true } })).map(s => s.sgid));
  const missingSchools = [...snrSeen.entries()]
    .filter(([snr]) => !existingSgid.has(snr))
    .map(([snr, name]) => ({ snr, name, files: decoded.filter(f => f.basedata.some((r: any) => r.SNR === snr)).map(f => f.name) }));

  const classPreview = decoded.flatMap(f => f.groupsextension.map(c => ({ lkid: c.LKGREIZ_GRID, name: c.SHORT0, snr: c.LOCATION0 })));

  const changes: any[] = [];
  const { decryptField } = await import("../encryption/envelope");
  for (const p of preview) {
    if (!p.lkid) continue;
    const existing = await prisma.person.findUnique({
      where: { lkid: p.lkid },
      include: { schools: { include: { school: true } }, classes: true },
    });
    if (!existing) continue;
    const oldEmail = decryptField(existing.emailEnc) || "";
    const oldClass = existing.classes[0]?.classKey?.split("-").slice(1).join("-") || "";
    if (p.email && oldEmail && p.email !== oldEmail) changes.push({ lkid: p.lkid, field: "E-Mail", old: oldEmail, new: p.email });
    if (p.klasse && oldClass && p.klasse !== oldClass) changes.push({ lkid: p.lkid, field: "Klasse", old: oldClass, new: p.klasse });
    if (p.stufe && existing.stufe && existing.stufe !== p.stufe) changes.push({ lkid: p.lkid, field: "Stufe", old: existing.stufe, new: p.stufe });
    if (existing.systemEmail) p.systemEmail = existing.systemEmail;
  }

  res.json({
    total: preview.length,
    issuesCount: issues.length,
    issues,
    preview: preview.slice(0, 500),
    classes: classPreview,
    changes,
    files: decoded.map(f => ({ name: f.name, type: f.type, personnel: f.basedata.length, classes: f.groupsextension.length })),
    missingSchools,
    message: missingSchools.length
      ? `Schule(n) fehlen: ${missingSchools.map(m => m.snr).join(", ")}`
      : issues.length === 0 ? "Keine Fehler – bereit zum Import" : `${issues.length} Zeilen mit Problemen`,
  });
});

router.post("/commit", async (req, res) => {
  const parsed = multiImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: parsed.error.issues });

  const decoded = decodeFiles(parsed.data.files);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[import:commit]", decoded.map(f => ({ name: f.name, personnel: f.basedata.length, classes: f.groupsextension.length })));
  }

  const existingUsernames = new Set((await prisma.person.findMany({ select: { username: true } })).map(p => p.username));
  const roleMap = new Map((await prisma.roleDefinition.findMany()).map(r => [r.dataId, r]));
  const schoolBySgid = new Map((await prisma.school.findMany()).map(s => [s.sgid, s]));
  const iotFlag = await prisma.flagDefinition.findUnique({ where: { dataId: "iot" } });

  let created = 0, updated = 0, skipped = 0, classesUpserted = 0;
  const errors: any[] = [];
  const seenClassLkids = new Map<string, Set<string>>();

  // Classes from groupsextension
  for (const file of decoded) {
    for (const c of file.groupsextension) {
      const snr = c.LOCATION0;
      const school = schoolBySgid.get(snr);
      if (!school || !c.SHORT0 || !c.LKGREIZ_GRID) continue;
      const name = c.SHORT0;
      const classKey = `${school.sid}-${name}`;
      const existing = await prisma.schoolClass.findUnique({ where: { schoolId_name: { schoolId: school.id, name } } });
      if (existing) {
        if (existing.lkid !== c.LKGREIZ_GRID) {
          await prisma.schoolClass.update({ where: { id: existing.id }, data: { lkid: c.LKGREIZ_GRID, active: true } });
        } else if (!existing.active) {
          await prisma.schoolClass.update({ where: { id: existing.id }, data: { active: true } });
        }
      } else {
        await prisma.schoolClass.create({ data: { schoolId: school.id, lkid: c.LKGREIZ_GRID, name, classKey, active: true } });
      }
      classesUpserted++;
      if (!seenClassLkids.has(school.id)) seenClassLkids.set(school.id, new Set());
      seenClassLkids.get(school.id)!.add(c.LKGREIZ_GRID);
    }
  }

  // Deactivate classes whose LKID was not in this import
  for (const [schoolId, lkids] of seenClassLkids) {
    await prisma.schoolClass.updateMany({
      where: { schoolId, lkid: { notIn: [...lkids] } },
      data: { active: false },
    });
  }

  // Personnel from basedata only
  for (const file of decoded) {
    const isPupilFile = file.type === "SuS" || /sus/i.test(file.name);
    for (const r of file.basedata) {
      try {
        const lkid = r.LKGREIZ_GRID;
        if (!lkid || !r.NNAME || !r.VNAME) { errors.push({ lkid, msg: "Pflichtfelder fehlen", source: file.name }); continue; }

        const existing = await prisma.person.findUnique({ where: { lkid }, include: { schools: true, roles: true, classes: true, flags: true } });
        const isPupil = isPupilFile || r.ENTITYTYPE === "s" || (!!r.KL && r.ENTITYTYPE !== "l");
        const school = schoolBySgid.get(r.SNR);
        if (!school) { errors.push({ lkid, msg: `Schule SNR ${r.SNR} nicht gefunden`, source: file.name }); continue; }

        const name = r.NNAME;
        const firstName = r.VNAME;
        const dob = normalizeDate(r.GEBDAT);
        const schoolStart = normalizeDate(r.SCHULBEG);
        const schoolEnd = normalizeDate(r.SCHULEND);
        const active = r.ENTLASSEN !== "j";
        const email = firstEmail(r.EMAIL);
        const wantIot = isIotActive(r.IOT);

        if (!existing) {
          const username = generateUsername(firstName, name, existingUsernames);
          const person = await prisma.person.create({
            data: {
              lkid,
              nameEnc: encryptField(name)!,
              firstNameEnc: encryptField(firstName)!,
              emailEnc: encryptField(email),
              username,
              dateOfBirth: dob,
              sex: r.GESCHL || null,
              schoolStart, schoolEnd, active,
              stufe: r.STUFE || null,
              appleId: `${username}@appleid.ds-greiz.de`.toLowerCase(),
              systemEmail: `${username}@${school.soid}.schulen-greiz.de`.toLowerCase(),
              schools: { create: { schoolId: school.id } },
              classes: r.KL ? { create: { schoolId: school.id, classKey: `${school.sid}-${r.KL}` } } : undefined,
            },
          });
          const roleDataId = isPupil ? "Schueler" : "Lehrer";
          const role = roleMap.get(roleDataId);
          if (role) await prisma.personRole.create({ data: { personId: person.id, roleId: role.id } });
          if (wantIot && iotFlag) await prisma.personFlag.create({ data: { personId: person.id, flagId: iotFlag.id } });
          created++;
        } else {
          const updates: any = {};
          if (existing.active !== active) updates.active = active;
          if (schoolEnd && existing.schoolEnd?.getTime() !== schoolEnd.getTime()) updates.schoolEnd = schoolEnd;
          if (email) updates.emailEnc = encryptField(email);
          if (r.STUFE && existing.stufe !== r.STUFE) updates.stufe = r.STUFE;
          if (Object.keys(updates).length) {
            await prisma.person.update({ where: { id: existing.id }, data: updates });
            updated++;
          } else skipped++;

          const hasSchool = existing.schools.some(ps => ps.schoolId === school.id);
          if (isPupil) {
            if (!hasSchool) {
              await prisma.personSchool.deleteMany({ where: { personId: existing.id } });
              await prisma.personSchool.create({ data: { personId: existing.id, schoolId: school.id } });
            }
          } else {
            if (!hasSchool) await prisma.personSchool.create({ data: { personId: existing.id, schoolId: school.id } });
          }
          if (r.KL) {
            const classKey = `${school.sid}-${r.KL}`;
            if (!existing.classes.some(c => c.classKey === classKey)) {
              await prisma.personClass.create({ data: { personId: existing.id, schoolId: school.id, classKey } });
            }
          }
          if (wantIot && iotFlag && !existing.flags.some(f => f.flagId === iotFlag.id)) {
            await prisma.personFlag.create({ data: { personId: existing.id, flagId: iotFlag.id } });
          }
        }
      } catch (e: any) {
        errors.push({ lkid: r.LKGREIZ_GRID, msg: e.message, source: file.name });
      }
    }
  }

  // Deactivate classes with no pupils
  const allClasses = await prisma.schoolClass.findMany();
  for (const sc of allClasses) {
    const count = await prisma.personClass.count({ where: { classKey: sc.classKey } });
    if (count === 0 && sc.active) {
      await prisma.schoolClass.update({ where: { id: sc.id }, data: { active: false } });
    }
  }

  await prisma.importJob.create({
    data: { filename: decoded.map(f => f.name).join(", "), status: "done", stats: { created, updated, skipped, errors: errors.length, classesUpserted } },
  });
  logger.audit("Import committed", { created, updated, skipped, errors: errors.length, classesUpserted });
  res.json({ created, updated, skipped, errors, classesUpserted, message: `Import abgeschlossen: ${created} neu, ${updated} aktualisiert, ${skipped} unverändert, ${classesUpserted} Klassen` });
});

export default router;