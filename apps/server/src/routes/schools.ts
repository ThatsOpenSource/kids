import { Router } from "express";
import { prisma } from "../db/prisma";
import { schoolSchema } from "../validation/schemas";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../services/logger";

const router = Router();

const updateSchoolSchema = schoolSchema.partial().extend({
  config: z.record(z.any()).optional(),
});

router.get("/", asyncHandler(async (_req, res) => {
  const schools = await prisma.school.findMany({ orderBy: { sid: "asc" } });
  res.json(schools);
}));

router.post("/", asyncHandler(async (req, res) => {
  const parsed = schoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: parsed.error.issues });

  const sid = parsed.data.sid;
  const soid = sid.slice(-2);
  const typeMap: Record<string, string> = { "21": "Grundschule", "22": "Regelschule", "23": "Gymnasium", "24": "Berufsschule", "27": "Förderschule" };
  const schoolType = typeMap[sid.slice(0, 2)] || parsed.data.schoolType || "Unbekannt";

  const school = await prisma.school.create({
    data: { ...parsed.data, soid, schoolType, config: parsed.data.config || {} },
  });
  logger.audit("School created", { sid: school.sid });
  res.status(201).json(school);
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const parsed = updateSchoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: parsed.error.issues });
  const school = await prisma.school.update({ where: { id: req.params.id }, data: parsed.data });
  logger.audit("School updated", { id: school.id, sid: school.sid });
  res.json(school);
}));

router.post("/import-csv", asyncHandler(async (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: "csv fehlt" });
  const lines = csv.trim().split(/\r?\n/).slice(1);
  let created = 0;
  for (const line of lines) {
    const [sid, sgid, name, schoolType] = line.split(",").map(s => s.trim());
    if (!sid || sid.length !== 5) continue;
    const soid = sid.slice(-2);
    const typeMap: Record<string, string> = { "21": "Grundschule", "22": "Regelschule", "23": "Gymnasium", "24": "Berufsschule", "27": "Förderschule" };
    await prisma.school.upsert({
      where: { sid },
      update: { sgid, name, schoolType: schoolType || typeMap[sid.slice(0, 2)] || "Unbekannt" },
      create: { sid, sgid, soid, name, schoolType: schoolType || typeMap[sid.slice(0, 2)] || "Unbekannt" },
    });
    created++;
  }
  logger.audit("Schools imported from CSV", { count: created });
  res.json({ imported: created });
}));

export default router;