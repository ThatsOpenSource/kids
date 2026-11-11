import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";

const router = Router();

router.post("/csv", async (req, res) => {
  const { schoolId, klasse, includeHeaders = true, confirmPassword } = req.body;
  if (!confirmPassword) return res.status(400).json({ error: "confirmPassword erforderlich (Step-up)" });
  if (!schoolId) return res.status(400).json({ error: "schoolId erforderlich" });

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return res.status(404).json({ error: "Schule nicht gefunden" });

  const where: any = { schools: { some: { schoolId } } };
  if (klasse) where.classes = { some: { classKey: { endsWith: `-${klasse}` } } };

  const persons = await prisma.person.findMany({
    where,
    include: { schools: { include: { school: true } }, roles: { include: { role: true } }, flags: { include: { flag: true } }, classes: true },
  });

  const headers = [
    "SID", "SGID", "SOID", "Schulname", "Schultyp",
    "LKID", "Nachname", "Vorname", "Benutzername", "Geschlecht",
    "Geburtsdatum", "Rollen", "Klassen", "Flags", "Aktiv",
    "AppleID", "SystemEmail", "Schulbeginn", "Schulende",
  ];

  const lines: string[] = [];
  if (includeHeaders) lines.push(headers.join(";"));

  for (const p of persons) {
    const roles = p.roles.map(r => `${school.soid}-${r.role.dataId}`).join(",");
    const isTeacher = p.roles.some(r => r.role.dataId === "Lehrer");
    let classes: string;
    if (isTeacher) {
      const sc = await prisma.schoolClass.findMany({ where: { schoolId: school.id, active: true } });
      classes = sc.map(c => `${school.soid}-${c.name}`).join(",");
    } else {
      classes = p.classes.map(c => {
        const name = c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey;
        return `${school.soid}-${name}`;
      }).join(",");
    }
    const flags = p.flags.map(f => f.flag.dataId).join(",");
    const row = [
      school.sid,
      school.sgid,
      school.soid,
      school.name,
      school.schoolType,
      p.lkid,
      decryptField(p.nameEnc) || "",
      decryptField(p.firstNameEnc) || "",
      p.username,
      p.sex === "m" ? "männlich" : p.sex === "w" ? "weiblich" : p.sex || "",
      p.dateOfBirth ? p.dateOfBirth.toLocaleDateString("de-DE") : "",
      roles,
      classes,
      flags,
      p.active ? "J" : "N",
      p.appleId || "",
      p.systemEmail || "",
      p.schoolStart ? p.schoolStart.toLocaleDateString("de-DE") : "",
      p.schoolEnd ? p.schoolEnd.toLocaleDateString("de-DE") : "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
    lines.push(row);
  }

  res.json({ csv: lines.join("\n"), count: persons.length });
});

export default router;