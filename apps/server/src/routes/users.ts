import { Router } from "express";
import { prisma } from "../db/prisma";
import * as auth from "../services/authService";
import { log } from "../services/audit";
import { ok, fail } from "../lib/respond";

const router = Router();

router.get("/", async (_req, res) => {
  const users = await prisma.appUser.findMany({ select: { id: true, email: true, role: true, active: true, mustChangePassword: true, totpEnabled: true, lastLoginAt: true, createdAt: true } });
  ok(res, users);
});

router.post("/", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return fail(res, 400, "email und password erforderlich");
  const user = await auth.registerUser(email, password, role || "operator");
  await log("user", user.id, "create", (req as any).userId, { email });
  ok(res, { id: user.id, email: user.email, role: user.role }, 201);
});

router.put("/:id", async (req, res) => {
  const target = await prisma.appUser.findUnique({ where: { id: req.params.id } });
  if (!target) return fail(res, 404, "Benutzer nicht gefunden");
  if (target.role === "admin" && req.body.active === false) return fail(res, 403, "Superadmin kann nicht deaktiviert werden");
  const { email, role, active } = req.body;
  const data: any = {};
  if (email) data.email = email.toLowerCase();
  if (role && target.role !== "admin") data.role = role;
  if (active !== undefined && target.role !== "admin") data.active = active;
  const user = await prisma.appUser.update({ where: { id: req.params.id }, data });
  await log("user", user.id, "update", (req as any).userId, { email, role, active });
  ok(res, { id: user.id, email: user.email, role: user.role, active: user.active });
});

router.delete("/:id", async (req, res) => {
  const target = await prisma.appUser.findUnique({ where: { id: req.params.id } });
  if (!target) return fail(res, 404, "Benutzer nicht gefunden");
  if (target.role === "admin") return fail(res, 403, "Superadmin kann nicht gelöscht werden");
  await prisma.appUser.delete({ where: { id: req.params.id } });
  await log("user", req.params.id, "delete", (req as any).userId, {});
  ok(res, { ok: true });
});

router.post("/:id/reset-password", async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return fail(res, 400, "newPassword erforderlich");
  await auth.changePassword(req.params.id, newPassword);
  await log("user", req.params.id, "password-reset", (req as any).userId, {});
  ok(res, { ok: true });
});

export default router;