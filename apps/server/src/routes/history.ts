import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";
import { ok } from "../lib/respond";

const router = Router();

router.get("/", async (req, res) => {
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId as string | undefined;
  const page = Math.max(1, parseInt(String(req.query.page || "1")));
  const limit = Math.min(100, parseInt(String(req.query.limit || "50")));
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);
  const mapped = await Promise.all(logs.map(async l => ({ ...l, details: JSON.parse(await decryptField(l.details as string) || "{}") })));
  ok(res, { total, page, limit, logs: mapped });
});

export default router;