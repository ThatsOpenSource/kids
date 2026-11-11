import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";
import { mergeFlags } from "../services/groupFlags";
import { ok, fail } from "../lib/respond";
import { verifyPassword } from "../services/authService";

const router = Router();

router.post("/csv", async (req, res) => {
  const { schoolId, klasse, confirmPassword } = req.body;
  if (!confirmPassword) return fail(res, 400, "Passwort erforderlich");
  const user = await prisma.appUser.findUnique({ where: { id: (req as any).userId } });
  if (!user || !(await verifyPassword(confirmPassword, user.passwordHash, user.salt))) return fail(res, 401, "Passwort falsch");

  const where: any = {};
  if (schoolId) where.schools = { some: { schoolId } };
  const persons = await prisma.person.findMany({
    where,
    include: { schools: { include: { school: true } }, roles: { include: { role: true } }, classes: true },
  });
  const headers = ["SID", "SGID", "SOID", "Schulname", "Schultyp", "Klasse", "Stufe", "LKID", "Name", "Vorname", "Benutzername", "Apple ID", "E-Mail", "System-E-Mail", "Rolle"];
  const lines = [headers.join(";")];
  for (const p of persons) {
    const s = p.schools[0]?.school;
    const cls = p.classes[0]?.classKey?.split("-").slice(1).join("-") || "";
    if (klasse && cls !== klasse) continue;
    lines.push([
      s?.sid || "", s?.sgid || "", s?.soid || "", s?.name || "", s?.schoolType || "",
      cls, p.stufe || "", p.lkid, await decryptField(p.name) || "", await decryptField(p.firstName) || "",
      p.username, p.appleId || "", await decryptField(p.email) || "", p.systemEmail || "",
      (await mergeFlags(p)).join(","),
      p.roles.map(r => r.role.label).join(","),
    ].map(v => `"${v}"`).join(";"));
  }
  ok(res, { csv: lines.join("\r\n") });
});

export default router;