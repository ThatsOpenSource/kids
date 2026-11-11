function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}
function fmtDateTime(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()} ${hh}:${mi}`;
}
import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField, encryptField } from "../encryption/envelope";
import { log } from "../services/audit";
import { ok, fail } from "../lib/respond";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/redis";
import { mergeFlags } from "../services/groupFlags";

const router = Router();

router.get("/", async (req, res) => {
  const cacheKey = `persons:${JSON.stringify(req.query)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return ok(res, cached);
  const page = Math.max(1, parseInt(String(req.query.page || "1")));
  const limit = Math.min(10000, parseInt(String(req.query.limit || "50")));
  const school = String(req.query.school || "").split(",").filter(Boolean);
  const role = String(req.query.role || "").split(",").filter(Boolean);
  const flag = String(req.query.flag || "").split(",").filter(Boolean);
  const stufe = String(req.query.stufe || "").split(",").filter(Boolean);
  const sortKey = String(req.query.sort || "");
  const sortDir = String(req.query.dir || "asc") === "desc" ? "desc" : "asc";
  const where: any = {};
  if (school.length) where.schools = { some: { school: { sid: { in: school } } } };
  if (role.length) where.roles = { some: { role: { label: { in: role } } } };
  if (flag.length) where.flags = { some: { flag: { dataId: { in: flag } } } };
  if (stufe.length) where.stufe = { in: stufe };
  const validSort = ["name", "firstName", "lkid", "username", "stufe", "active", "createdAt", "updatedAt"];
  const orderBy: any = sortKey && validSort.includes(sortKey) ? { [sortKey]: sortDir } : { lkid: "asc" };
  const [total, persons] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: { schools: { include: { school: true } }, roles: { include: { role: true } }, flags: { include: { flag: true } }, classes: true },
    }),
  ]);
  persons.sort((a, b) => {
    if (sortKey && validSort.includes(sortKey)) {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === "desc" ? -cmp : cmp;
    }
    const sidA = a.schools[0]?.school.sid || "";
    const sidB = b.schools[0]?.school.sid || "";
    if (sidA !== sidB) return sidA.localeCompare(sidB);
    const vceA = a.roles[0]?.role.vceType || 999;
    const vceB = b.roles[0]?.role.vceType || 999;
    if (vceA !== vceB) return vceA - vceB;
    const isPupilA = a.roles.some(r => r.role.dataId === "Schueler");
    const isPupilB = b.roles.some(r => r.role.dataId === "Schueler");
    if (isPupilA && isPupilB) {
      const clsA = a.classes[0]?.classKey || "";
      const clsB = b.classes[0]?.classKey || "";
      if (clsA !== clsB) return clsA.localeCompare(clsB);
    }
    return (a.name || "").localeCompare(b.name || "");
  });
  const mapped = await Promise.all(persons.map(async p => {
    const primary = p.schools[0]?.school;
    const cleanClass = p.classes[0]?.classKey?.includes("-") ? p.classes[0].classKey.split("-").slice(1).join("-") : (p.classes[0]?.classKey || "");
    const isTeacher = p.roles.some(r => r.role.dataId === "Lehrer");
    return {
      id: p.id, sid: primary?.sid || "", sgid: primary?.sgid || "", soid: primary?.soid || "",
      schoolName: primary?.name || "", schoolType: primary?.schoolType || "",
      klasse: isTeacher ? "alle" : cleanClass, stufe: p.stufe || "",
      lkid: p.lkid, name: await decryptField(p.name) || "", firstName: await decryptField(p.firstName) || "",
      dateOfBirth: fmtDate(p.dateOfBirth),
      createdAt: fmtDateTime(p.createdAt),
      updatedAt: fmtDateTime(p.updatedAt),
      username: p.username, appleId: p.appleId || "", email: await decryptField(p.email) || "",
      systemEmail: p.systemEmail || "", flags: (await mergeFlags(p)).map(id => { const f = p.flags.find(x => x.flag.dataId === id); return f?.flag.label || id; }),
      flagLabels: p.flags.map(f => f.flag.label), roles: p.roles.map(r => r.role.label),
      roleDataIds: p.roles.map(r => r.role.dataId), vceTypes: p.roles.map(r => r.role.vceType),
      hasPassword: !!p.password, active: p.active, terminated: !p.active, isPupil: p.roles.some(r => r.role.dataId === "Schueler"),
    };
  }));
  ok(res, { total, page, limit, persons: mapped });
  cacheSet(cacheKey, { total, page, limit, persons: mapped });
});

router.get("/:id", async (req, res) => {
  const p = await prisma.person.findUnique({
    where: { id: req.params.id },
    include: { schools: { include: { school: true } }, roles: { include: { role: true } }, flags: { include: { flag: true } }, classes: true },
  });
  if (!p) return fail(res, 404, "Nicht gefunden");
  ok(res, {
    id: p.id, lkid: p.lkid, name: await decryptField(p.name), firstName: await decryptField(p.firstName),
    email: await decryptField(p.email), username: p.username, appleId: p.appleId, systemEmail: p.systemEmail,
    stufe: p.stufe, active: p.active, sex: p.sex, dateOfBirth: p.dateOfBirth,
    hasPassword: !!p.password, roles: p.roles.map(r => r.roleId), flags: p.flags.map(f => f.flagId),
  });
});

router.put("/:id", async (req, res) => {
  const { name, firstName, email, stufe, active, sex } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = await encryptField(name);
  if (firstName !== undefined) data.firstName = await encryptField(firstName);
  if (email !== undefined) data.email = await encryptField(email?.toLowerCase() || null);
  if (stufe !== undefined) data.stufe = stufe;
  if (active !== undefined) data.active = active;
  if (sex !== undefined) data.sex = sex;
  const p = await prisma.person.update({ where: { id: req.params.id }, data });
  await log("person", p.id, "update", (req as any).userId, { fields: Object.keys(data) });
  cacheInvalidate("persons:*");
  ok(res, { ok: true });
});

router.post("/:id/copy-password", async (req, res) => {
  const p = await prisma.person.findUnique({ where: { id: req.params.id } });
  if (!p?.password) return fail(res, 404, "Kein Passwort");
  await log("person", p.id, "password-reveal", (req as any).userId, {});
  ok(res, { password: await decryptField(p.password) || "" });
});

router.post("/:id/set-password", async (req, res) => {
  const { password } = req.body;
  if (!password) return fail(res, 400, "password erforderlich");
  await prisma.person.update({ where: { id: req.params.id }, data: { password: await encryptField(password) } });
  await log("person", req.params.id, "password-set", (req as any).userId, {});
  ok(res, { ok: true });
});

export default router;