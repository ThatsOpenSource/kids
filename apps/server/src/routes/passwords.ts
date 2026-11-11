import { Router } from "express";
import { prisma } from "../db/prisma";
import { encryptField } from "../encryption/envelope";
import { log } from "../services/audit";
import { ok } from "../lib/respond";

const router = Router();

const CHILD_WORDS = ["Apfel","Banane","Birne","Kirsche","Sonne","Mond","Hund","Katze","Baum","Blume","Haus","Auto","Ball","Buch","Herz"];

function genPupil(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 7; i++) s += i === 3 ? (Math.random() > 0.5 ? "?" : "!") : chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function genStaff(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#!?_-";
  let s = "";
  for (let i = 0; i < 9; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.post("/generate", async (req, res) => {
  const { refs, force, mode, customPassword } = req.body;
  const where: any = refs?.length ? { id: { in: refs } } : {};
  const persons = await prisma.person.findMany({ where, take: 500, include: { roles: { include: { role: true } }, schools: { include: { school: true } } } });
  let generated = 0;
  const usedWords = new Set<string>();
  for (const p of persons) {
    if (p.password && !force) continue;
    const isPupil = p.roles.some(r => r.role.dataId === "Schueler");
    const isGrund = p.schools[0]?.school?.schoolType === "Grundschule";
    let pw: string;
    if (mode === "custom" && customPassword) pw = customPassword;
    else if (isPupil && isGrund) { pw = CHILD_WORDS[Math.floor(Math.random() * CHILD_WORDS.length)]; usedWords.add(pw); }
    else if (isPupil) pw = genPupil();
    else pw = genStaff();
    await prisma.person.update({ where: { id: p.id }, data: { password: await encryptField(pw) } });
    await log("person", p.id, "password-generate", (req as any).userId, { mode });
    generated++;
  }
  ok(res, { generated });
});

export default router;