import { Router } from "express";
import { prisma } from "../db/prisma";
import { log } from "../services/audit";
import { ok, fail } from "../lib/respond";

const router = Router();

router.get("/", async (_req, res) => {
  ok(res, await prisma.school.findMany({ orderBy: { sid: "asc" }, include: { type: true } }));
});

router.post("/", async (req, res) => {
  const { sid, sgid, name, config } = req.body;
  if (!sid || sid.length !== 5) return fail(res, 400, "SID muss 5-stellig sein");
  const soid = sid.slice(-2);
  const typeId = sid.slice(0, 2);
  const typeExists = await prisma.schoolTypeConfig.findUnique({ where: { prefix: typeId } });
  if (!typeExists) return fail(res, 400, `Kein Schultyp für Prefix ${typeId}`);
  const school = await prisma.school.create({ data: { sid, sgid, soid, name, typeId, config: config || {} } });
  await log("school", school.id, "create", (req as any).userId, { sid, name });
  ok(res, school, 201);
});

router.get("/type-configs", async (_req, res) => ok(res, await prisma.schoolTypeConfig.findMany()));
router.post("/type-configs", async (req, res) => {
  const { prefix, label } = req.body;
  if (!prefix || !label) return fail(res, 400, "prefix und label erforderlich");
  const tc = await prisma.schoolTypeConfig.upsert({ where: { prefix }, update: { label }, create: { prefix, label } });
  ok(res, tc, 201);
});
router.delete("/type-configs/:prefix", async (req, res) => {
  const used = await prisma.school.count({ where: { typeId: req.params.prefix } });
  if (used) return fail(res, 409, `Typ wird von ${used} Schulen verwendet`);
  await prisma.schoolTypeConfig.delete({ where: { prefix: req.params.prefix } });
  ok(res, { ok: true });
});

function cleanName(name: string): string {
  return name.replace(/["""''`]/g, "").replace(/[^\w\säöüÄÖÜß\-]/g, "").replace(/\s+/g, " ").trim();
}

function parseCsvLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map(s => s.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
}

router.post("/import-preview", async (req, res) => {
  const { csv } = req.body;
  if (!csv) return fail(res, 400, "csv fehlt");
  const lines = csv.trim().replace(/\uFEFF/, "").split(/\r?\n/).slice(1);
  const existing = await prisma.school.findMany();
  const bySid = new Map(existing.map(s => [s.sid, s]));
  const typeConfigs = await prisma.schoolTypeConfig.findMany();
  console.log(`[school-import] ${lines.length} lines, ${typeConfigs.length} type configs`);
  const typeMap = new Map(typeConfigs.map(t => [t.prefix, t.label]));
  const preview: any[] = [];
  const rejected: any[] = [];
  for (const line of lines) {
    const [sid, sgid, name] = parseCsvLine(line);
    if (!sid || sid.length !== 5) { rejected.push({ line, reason: "SID ungültig" }); continue; }
    const soid = sid.slice(-2);
    const prefix = sid.slice(0, 2);
    const schoolType = typeMap.get(prefix);
    if (!schoolType) { rejected.push({ sid, reason: `Kein Typ für Prefix ${prefix}` }); continue; }
    preview.push({ sid, sgid, soid, name: cleanName(name), schoolType, isNew: !bySid.has(sid) });
  }
  ok(res, { preview, rejected, newCount: preview.filter(r => r.isNew).length });
  console.log(`[school-import] preview: ${preview.length} valid, ${rejected.length} rejected`);
});

router.post("/import-csv", async (req, res) => {
  const { csv, selected } = req.body;
  if (!csv) return fail(res, 400, "csv fehlt");
  const lines = csv.trim().replace(/\uFEFF/, "").split(/\r?\n/).slice(1);
  const sel = new Set(selected || []);
  const typeConfigs = await prisma.schoolTypeConfig.findMany();
  const typeMap = new Map(typeConfigs.map(t => [t.prefix, t.label]));
  let created = 0, updated = 0, skipped = 0;
  for (const line of lines) {
    const [sid, sgid, name] = parseCsvLine(line);
    if (!sid || sid.length !== 5) { skipped++; continue; }
    if (sel.size && !sel.has(sid)) continue;
    const soid = sid.slice(-2);
    const schoolType = typeMap.get(sid.slice(0, 2));
    if (!schoolType) { skipped++; continue; }
    const existing = await prisma.school.findUnique({ where: { sid } });
    await prisma.school.upsert({
      where: { sid },
      update: { sgid, soid, name, typeId: sid.slice(0, 2) },
      create: { sid, sgid, soid, name, typeId: sid.slice(0, 2) },
    });
    existing ? updated++ : created++;
  }
  ok(res, { created, updated, skipped });
});

router.put("/:id", async (req, res) => {
  const school = await prisma.school.update({ where: { id: req.params.id }, data: req.body });
  await log("school", school.id, "update", (req as any).userId, req.body);
  ok(res, school);
});

export default router;