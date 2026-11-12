import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../db/prisma";
import * as auth from "../services/authService";
import { log } from "../services/audit";
import { requireAuth } from "../middleware/auth";
import { ok, fail } from "../lib/respond";
import { encryptField, decryptField } from "../encryption/envelope";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const user = await auth.loginUser(req.body.email, req.body.password);
    const access = auth.signAccess(user.id, user.role);
    const refresh = auth.signRefresh(user.id);
    await auth.storeRefresh(user.id, refresh);
    await log("user", user.id, "login", user.id, {});
    ok(res, {
      accessToken: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword, totpEnabled: user.totpEnabled },
    });
  } catch (e: any) {
    fail(res, 401, e.message, { code: e.code || "auth_failed", path: "/api/auth/login" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 400, "refreshToken fehlt");
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "dev-refresh") as any;
    const tokens = await prisma.refreshToken.findMany({ where: { userId: payload.sub } });
    let match = null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) { match = t; break; }
    }
    if (!match) return fail(res, 401, "Refresh ungültig", { code: "refresh_invalid" });
    const user = await prisma.appUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return fail(res, 401, "Benutzer nicht gefunden", { code: "user_not_found" });
    const access = auth.signAccess(user.id, user.role);
    const next = auth.signRefresh(user.id);
    await prisma.refreshToken.delete({ where: { id: match.id } });
    await auth.storeRefresh(user.id, next);
    ok(res, { accessToken: access, refreshToken: next });
  } catch {
    fail(res, 401, "Refresh abgelaufen", { code: "refresh_expired" });
  }
});

router.post("/change-password", async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return fail(res, 400, "userId und newPassword erforderlich");
  await auth.changePassword(userId, newPassword);
  await log("user", userId, "password-change", userId, {});
  ok(res, { ok: true });
});

router.get("/2fa/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) return fail(res, 401, "Nicht angemeldet");
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  ok(res, { enabled: user?.totpEnabled || false });
});

router.post("/2fa/setup", requireAuth, async (req, res) => {
  const user = await prisma.appUser.findUnique({ where: { id: (req as any).userId } });
  if (!user) return fail(res, 401, "Nicht angemeldet");
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, "KIDS", secret);
  const qr = await QRCode.toDataURL(otpauth);
  await prisma.appUser.update({ where: { id: user.id }, data: { totpSecret: await encryptField(secret) } });
  ok(res, { qr, secret });
});

router.post("/2fa/verify", requireAuth, async (req, res) => {
  const user = await prisma.appUser.findUnique({ where: { id: (req as any).userId } });
  if (!user?.totpSecret) return fail(res, 400, "2FA nicht eingerichtet");
  const secret = await decryptField(user.totpSecret);
  if (!authenticator.check(req.body.code, secret || "")) return fail(res, 401, "Code ungültig");
  ok(res, { ok: true });
});

router.post("/2fa/confirm", requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = await prisma.appUser.findUnique({ where: { id: (req as any).userId } });
  if (!user?.totpSecret) return fail(res, 400, "Kein Setup gestartet");
  const secret = await decryptField(user.totpSecret);
  if (!secret || !authenticator.check(code, secret)) return fail(res, 401, "Code ungültig");
  await prisma.appUser.update({ where: { id: user.id }, data: { totpEnabled: true } });
  await log("user", user.id, "2fa-enabled", user.id, {});
  ok(res, { ok: true });
});

export default router;