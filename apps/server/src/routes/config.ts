import { Router } from "express";
import { prisma } from "../db/prisma";
import { roleSchema, flagSchema } from "../validation/schemas";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../services/logger";

const router = Router();

router.get("/roles", asyncHandler(async (_req, res) => {
  res.json(await prisma.roleDefinition.findMany({ orderBy: { vceType: "asc" } }));
}));

router.post("/roles", asyncHandler(async (req, res) => {
  const p = roleSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: p.error.issues });
  const role = await prisma.roleDefinition.create({ data: p.data });
  logger.audit("Role created", { dataId: role.dataId, vceType: role.vceType });
  res.status(201).json(role);
}));

router.put("/roles/:id", asyncHandler(async (req, res) => {
  const p = roleSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: p.error.issues });
  const role = await prisma.roleDefinition.update({ where: { id: req.params.id }, data: p.data });
  logger.audit("Role updated", { id: role.id });
  res.json(role);
}));

router.get("/flags", asyncHandler(async (_req, res) => {
  res.json(await prisma.flagDefinition.findMany());
}));

router.post("/flags", asyncHandler(async (req, res) => {
  const p = flagSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: p.error.issues });
  const flag = await prisma.flagDefinition.create({ data: p.data });
  logger.audit("Flag created", { dataId: flag.dataId });
  res.status(201).json(flag);
}));

router.put("/flags/:id", asyncHandler(async (req, res) => {
  const p = flagSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: p.error.issues });
  const flag = await prisma.flagDefinition.update({ where: { id: req.params.id }, data: p.data });
  logger.audit("Flag updated", { id: flag.id });
  res.json(flag);
}));

router.get("/group-flags", asyncHandler(async (_req, res) => {
  const groups = await prisma.groupFlag.findMany({ include: { flag: true } });
  const roles = await prisma.roleDefinition.findMany();
  const schools = await prisma.school.findMany();
  res.json(groups.map(g => ({
    id: g.id,
    flagId: g.flagId,
    flag: g.flag.dataId,
    roleId: g.roleId,
    role: roles.find(r => r.id === g.roleId)?.label || null,
    schoolId: g.schoolId,
    school: schools.find(s => s.id === g.schoolId)?.name || null,
  })));
}));

router.post("/group-flags", asyncHandler(async (req, res) => {
  const { flagId, roleId, schoolId } = req.body;
  if (!flagId) return res.status(400).json({ error: "flagId erforderlich" });
  const gf = await prisma.groupFlag.create({ data: { flagId, roleId: roleId || null, schoolId: schoolId || null } });
  logger.audit("Group flag created", { flagId, roleId, schoolId });
  res.status(201).json(gf);
}));

router.delete("/group-flags/:id", asyncHandler(async (req, res) => {
  await prisma.groupFlag.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;