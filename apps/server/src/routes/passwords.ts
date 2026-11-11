import { Router } from "express";
import { prisma } from "../db/prisma";
import { encryptField, decryptField } from "../encryption/envelope";
import { pickChildWord, genPupilAlnum, genStaff } from "../services/passwords";

const router = Router();

function generatePassword(policy: any = {}): string {
  const length = policy.length || 12;
  const upper = policy.upper !== false;
  const lower = policy.lower !== false;
  const digits = policy.digits !== false;
  const special = policy.special === true;
  const words = policy.words || [];
  const wordCount = policy.wordCount || 0;

  if (wordCount > 0 && words.length) {
    const picked = Array.from({ length: wordCount }, () => words[Math.floor(Math.random() * words.length)]);
    return picked.join("-") + Math.floor(Math.random() * 90 + 10);
  }

  let chars = "";
  if (lower) chars += "abcdefghijklmnopqrstuvwxyz";
  if (upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (digits) chars += "0123456789";
  if (special) chars += "!@#$%&*";
  if (!chars) chars = "abcdefghijklmnopqrstuvwxyz0123456789";

  let pw = "";
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

router.post("/generate", async (req, res) => {
  const { scope, ref, refs, schoolId, force, confirmPassword } = req.body;
  if (!confirmPassword) return res.status(400).json({ error: "confirmPassword erforderlich (Step-up)" });

  const where: any = {};
  if (scope === "school" && schoolId) where.schools = { some: { schoolId } };
  if (scope === "class" && ref) where.classes = { some: { classKey: { contains: ref } } };
  if (scope === "person" && ref) where.lkid = ref;
  if (scope === "person" && Array.isArray(refs) && refs.length) where.id = { in: refs };
  if (scope === "role" && ref) where.roles = { some: { role: { dataId: ref } } };

  const persons = await prisma.person.findMany({
    where,
    take: 500,
    include: { roles: { include: { role: true } }, schools: { include: { school: true } }, classes: true },
  });
  let generated = 0;
  const results: any[] = [];

  const usedWords = new Set<string>();
  for (const p of persons) {
    if (p.passwordEnc && !force) continue;
    const isPupil = p.roles?.some((r: any) => r.role?.dataId === "Schueler");
    const isGrund = p.schools?.[0]?.school?.schoolType === "Grundschule";
    let pw: string;
    if (isPupil && isGrund) pw = pickChildWord(usedWords);
    else if (isPupil) pw = genPupilAlnum();
    else pw = genStaff();
    if (isPupil && isGrund) usedWords.add(pw.toLowerCase());
    await prisma.person.update({ where: { id: p.id }, data: { passwordEnc: encryptField(pw) } });
    results.push({ lkid: p.lkid, username: p.username, password: pw });
    generated++;
  }

  await prisma.passwordRevealLog.create({ data: { userId: "system", scope, ref: ref || (refs ? refs.join(",") : null) } });
  res.json({ generated, results });
});

router.post("/reveal", async (req, res) => {
  const { scope, ref, schoolId, confirmPassword } = req.body;
  if (!confirmPassword) return res.status(400).json({ error: "confirmPassword erforderlich" });

  const where: any = {};
  if (scope === "person" && ref) where.lkid = ref;
  else if (scope === "school" && schoolId) where.schools = { some: { schoolId } };

  const persons = await prisma.person.findMany({ where, take: 100 });
  const revealed = persons.map(p => ({
    lkid: p.lkid,
    username: p.username,
    password: decryptField(p.passwordEnc) || "(nicht gesetzt)",
  }));

  await prisma.passwordRevealLog.create({ data: { userId: "system", scope, ref: ref || null } });
  res.json({ revealed });
});

export default router;