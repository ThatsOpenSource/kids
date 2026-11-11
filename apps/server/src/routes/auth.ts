import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";
import { loginSchema } from "../validation/schemas";
import * as authService from "../services/authService";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await authService.registerUser(email, password, role);
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: parsed.error.issues });

  try {
    const fingerprint = req.headers["x-device-fingerprint"] as string || "";
    const user = await authService.loginUser(parsed.data.email, parsed.data.password, fingerprint);

    if (user.totpEnabled) {
      const pre = jwt.sign({ sub: user.id, purpose: "preauth" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "5m" });
      return res.json({ requiresTotp: true, preAuthToken: pre });
    }

    const access = authService.signAccess(user.id, user.role, fingerprint);
    const refresh = authService.signRefresh(user.id);
    await authService.storeRefresh(user.id, refresh);
    res.json({ accessToken: access, refreshToken: refresh, user: { id: user.id, email: user.email, role: user.role, totpEnabled: user.totpEnabled } });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken fehlt" });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    const tokens = await prisma.refreshToken.findMany({ where: { userId: payload.sub } });
    let match = null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) { match = t; break; }
    }
    if (!match) return res.status(401).json({ error: "Refresh ungültig" });
    const user = await prisma.appUser.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Benutzer nicht gefunden" });
    const access = authService.signAccess(user.id, user.role);
    const next = authService.signRefresh(user.id);
    await prisma.refreshToken.delete({ where: { id: match.id } });
    await authService.storeRefresh(user.id, next);
    res.json({ accessToken: access, refreshToken: next });
  } catch {
    res.status(401).json({ error: "Refresh abgelaufen" });
  }
});

router.post("/login/totp", async (req, res) => {
  const { preAuthToken, totpCode } = req.body;
  try {
    const payload = jwt.verify(preAuthToken, process.env.JWT_ACCESS_SECRET!) as any;
    if (payload.purpose !== "preauth") throw new Error();
    await authService.verifyTotp(payload.sub, totpCode);
    const user = await import("../db/prisma").then(m => m.prisma.appUser.findUnique({ where: { id: payload.sub } }));
    if (!user) throw new Error();
    const access = authService.signAccess(user.id, user.role);
    res.json({ accessToken: access, user: { id: user.id, email: user.email, role: user.role, totpEnabled: true } });
  } catch (e: any) {
    res.status(401).json({ error: e.message || "Token ungültig" });
  }
});

router.post("/2fa/setup", async (req, res) => {
  const { email } = req.body;
  const result = await authService.setupTotp(email || "admin@kids.local");
  res.json(result);
});

router.post("/2fa/confirm", async (req, res) => {
  try {
    const { userId, secret, totpCode } = req.body;
    await authService.confirmTotp(userId, secret, totpCode);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;