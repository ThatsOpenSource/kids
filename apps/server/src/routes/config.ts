import { Router } from "express";
import { prisma } from "../db/prisma";
import { log } from "../services/audit";
import { ok } from "../lib/respond";

const router = Router();

router.get("/roles", async (_req, res) => ok(res, await prisma.roleDefinition.findMany({ orderBy: { vceType: "asc" } })));
router.post("/roles", async (req, res) => {
  const { vceType, dataId, label, aliases } = req.body;
  const role = await prisma.roleDefinition.create({ data: { vceType, dataId, label, aliases: aliases || [] } });
  await log("role", role.id, "create", (req as any).userId, { dataId });
  ok(res, role, 201);
});
router.put("/roles/:id", async (req, res) => {
  const role = await prisma.roleDefinition.update({ where: { id: req.params.id }, data: req.body });
  await log("role", role.id, "update", (req as any).userId, req.body);
  ok(res, role);
});

router.get("/flags", async (_req, res) => ok(res, await prisma.flagDefinition.findMany()));
router.post("/flags", async (req, res) => {
  const { dataId, label, requires } = req.body;
  const flag = await prisma.flagDefinition.create({ data: { dataId, label, requires: requires || [] } });
  await log("flag", flag.id, "create", (req as any).userId, { dataId });
  ok(res, flag, 201);
});
router.put("/flags/:id", async (req, res) => {
  const flag = await prisma.flagDefinition.update({ where: { id: req.params.id }, data: req.body });
  await log("flag", flag.id, "update", (req as any).userId, req.body);
  ok(res, flag);
});

router.get("/group-flags", async (_req, res) => {
  const groups = await prisma.groupFlag.findMany({ include: { flag: true } });
  ok(res, groups);
});
router.post("/group-flags", async (req, res) => {
  const gf = await prisma.groupFlag.create({ data: req.body });
  await log("groupFlag", gf.id, "create", (req as any).userId, req.body);
  ok(res, gf, 201);
});
router.delete("/group-flags/:id", async (req, res) => {
  await prisma.groupFlag.delete({ where: { id: req.params.id } });
  ok(res, { ok: true });
});

router.get("/rules", async (_req, res) => {
  const row = await prisma.school.findFirst({ where: { sid: "__rules__" } });
  ok(res, row?.config || { words: null, overrides: [] });
});

router.put("/rules", async (req, res) => {
  const { words, overrides } = req.body;
  await prisma.school.upsert({
    where: { sid: "__rules__" },
    update: { config: { words, overrides } },
    create: { sid: "__rules__", sgid: "0", soid: "0", name: "Regeln", schoolType: "System", config: { words, overrides } },
  });
  ok(res, { ok: true });
});

export default router;