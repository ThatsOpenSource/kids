import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";
import { mergeFlags } from "../services/groupFlags";

const router = Router();

router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1")));
  const limit = Math.min(200, parseInt(String(req.query.limit || "50")));
  const skip = (page - 1) * limit;
  const school = String(req.query.school || "").split(",").filter(Boolean);
  const role = String(req.query.role || "").split(",").filter(Boolean);
  const flag = String(req.query.flag || "").split(",").filter(Boolean);
  const stufe = String(req.query.stufe || "").split(",").filter(Boolean);
  const q = String(req.query.q || "").trim().toLowerCase();

  const where: any = {};
  if (school.length) where.schools = { some: { school: { sid: { in: school } } } };
  if (role.length) where.roles = { some: { role: { label: { in: role } } } };
  if (flag.length) where.flags = { some: { flag: { dataId: { in: flag } } } };
  if (stufe.length) where.stufe = { in: stufe };

  const [total, persons] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where, skip, take: limit,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schools: { include: { school: true } },
        roles: { include: { role: true } },
        flags: { include: { flag: true } },
        classes: true,
      },
    }),
  ]);

  const mapped = await Promise.all(persons.map(async p => {
    const primary = p.schools[0]?.school;
    const cleanClass = p.classes[0]?.classKey?.includes("-")
      ? p.classes[0].classKey.split("-").slice(1).join("-")
      : (p.classes[0]?.classKey || "");
    const flags = await mergeFlags(p);
    return {
      id: p.id,
      sid: primary?.sid || "",
      sgid: primary?.sgid || "",
      soid: primary?.soid || "",
      schoolName: primary?.name || "",
      schoolType: primary?.schoolType || "",
      klasse: cleanClass,
      stufe: p.stufe || "",
      lkid: p.lkid,
      name: decryptField(p.nameEnc) || "",
      firstName: decryptField(p.firstNameEnc) || "",
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toLocaleDateString("de-DE") : "",
      username: p.username,
      appleId: p.appleId || "",
      email: decryptField(p.emailEnc) || "",
      systemEmail: p.systemEmail || "",
      flags,
      flagLabels: flags.map(f => {
        const map: Record<string, string> = { dvv: "Datenverarbeiterungsvertrag", mdm: "MDM", cloud: "Nextcloud", print: "PaperCut", iot: "Zentrale Dienste" };
        return map[f] || f;
      }),
      classes: p.roles.some(r => r.role.dataId === "Lehrer") ? ["alle"] : p.classes.map(c => c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey),
      klasse: p.roles.some(r => r.role.dataId === "Lehrer") ? "alle" : cleanClass,
      amsId: p.amsId,
      active: p.active,
      terminated: !p.active,
      roles: p.roles.map(pr => pr.role.label),
      vceTypes: p.roles.map(pr => pr.role.vceType),
      roleDataIds: p.roles.map(pr => pr.role.dataId),
      hasPassword: !!p.passwordEnc,
      isPupil: p.roles.some(r => r.role.dataId === "Schueler"),
    };
  }));

  res.json({ total, page, limit, persons: mapped });
});

router.post("/:id/copy-password", async (req, res) => {
  const p = await prisma.person.findUnique({ where: { id: req.params.id } });
  if (!p?.passwordEnc) return res.status(404).json({ error: "Kein Passwort gesetzt" });
  const plain = decryptField(p.passwordEnc);
  res.json({ password: plain || "" });
});

export default router;