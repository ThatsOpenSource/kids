import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { encryptField } from "../encryption/envelope";

const ROUNDS = 12;

function prepare(password: string, salt: string): string {
  const pepper = process.env.PASSWORD_PEPPER || "";
  const input = pepper ? `${password}:${salt}` : `${password}:${salt}`;
  if (!pepper) return input;
  return crypto.createHmac("sha256", pepper).update(input).digest("hex");
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await bcrypt.hash(prepare(password, salt), ROUNDS);
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return bcrypt.compare(prepare(password, salt), hash);
}

export function signAccess(userId: string, role: string) {
  return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET || "dev-access", { expiresIn: "15m" });
}

export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET || "dev-refresh", { expiresIn: "7d" });
}

export async function storeRefresh(userId: string, token: string) {
  const tokenHash = await bcrypt.hash(token, 10);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 864e5) },
  });
}

export async function registerUser(email: string, password: string, role = "operator") {
  const { hash, salt } = await hashPassword(password);
  return prisma.appUser.create({
    data: { email: email.toLowerCase(), passwordHash: hash, salt, role, mustChangePassword: true },
  });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.appUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw Object.assign(new Error("Benutzer nicht gefunden"), { code: "user_not_found" });
  if (!user.active) throw Object.assign(new Error("Benutzer deaktiviert"), { code: "user_inactive" });
  const ok = await verifyPassword(password, user.passwordHash, user.salt);
  if (!ok) {
    console.log(`Login fail for ${email}: hash=${user.passwordHash.slice(0, 7)}, salt=${user.salt?.length || 0}b, pepper=${(process.env.PASSWORD_PEPPER || "").length}b`);
    throw Object.assign(new Error("Passwort falsch"), { code: "bad_password" });
  }
  await prisma.appUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function changePassword(userId: string, newPassword: string) {
  const { hash, salt } = await hashPassword(newPassword);
  return prisma.appUser.update({
    where: { id: userId },
    data: { passwordHash: hash, salt, mustChangePassword: false },
  });
}

export async function encryptPasswordForPerson(plain: string) {
  return await encryptField(plain);
}