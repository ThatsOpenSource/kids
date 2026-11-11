import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../db/prisma";
import { encryptField, decryptField } from "../encryption/envelope";

export async function registerUser(email: string, password: string, role: "admin" | "operator" | "viewer" = "viewer") {
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) throw new Error("E-Mail bereits registriert");
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.appUser.create({ data: { email, passwordHash, role } });
}

export async function loginUser(email: string, password: string, fingerprint?: string) {
  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error("Ungültige Anmeldedaten");
  }
  if (user.deviceFingerprint && fingerprint && user.deviceFingerprint !== fingerprint) {
    throw new Error("Geräte-Fingerprint stimmt nicht überein");
  }
  if (fingerprint && !user.deviceFingerprint) {
    await prisma.appUser.update({ where: { id: user.id }, data: { deviceFingerprint: fingerprint } });
  }
  return user;
}

export function signAccess(userId: string, role: string, fingerprint?: string) {
  return jwt.sign({ sub: userId, role, fp: fingerprint || "" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
}

export function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
}

export async function storeRefresh(userId: string, token: string) {
  const tokenHash = await bcrypt.hash(token, 10);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 864e5) },
  });
}

export async function setupTotp(email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, "KIDS", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { secret, qrDataUrl };
}

export async function confirmTotp(userId: string, secret: string, code: string) {
  if (!authenticator.check(code, secret)) throw new Error("Code ungültig");
  await prisma.appUser.update({
    where: { id: userId },
    data: { totpSecretEnc: encryptField(secret), totpEnabled: true, totpVerifiedAt: new Date() },
  });
}

export async function verifyTotp(userId: string, code: string) {
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user?.totpEnabled || !user.totpSecretEnc) throw new Error("2FA nicht aktiv");
  const secret = decryptField(user.totpSecretEnc);
  if (!secret || !authenticator.check(code, secret)) throw new Error("Ungültiger Code");
  return true;
}