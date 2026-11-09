import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { validate } from '../middleware/validate';
import { logger } from '../utils/logger';

const router = Router();

const schoolType = z.enum(['grundschule', 'regelschule', 'gymnasium', 'sonstige']);

const createSchoolSchema = z.object({
  id: z.string().min(1).max(16).regex(/^\d+$/, 'Schulnummer (nur Ziffern)'),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  type: schoolType,
  /** KZ-SNr – optional, e.g. "45" */
  kzSnr: z.string().max(16).optional().nullable(),
  location: z.string().max(128).optional().nullable(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

const updateSchoolSchema = createSchoolSchema.partial().omit({ id: true }).extend({
  code: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(256).optional(),
  type: schoolType.optional(),
});

router.get('/', requireAuth, async (_req, res) => {
  const schools = await prisma.school.findMany({ orderBy: { id: 'asc' } });
  res.json({
    schools: schools.map((s) => ({
      id: s.id,
      schulnummer: s.id,
      code: s.code,
      kzOu: s.code,
      kzSnr: s.kzSnr,
      name: s.name,
      type: s.type,
      location: s.location,
      amsLocationId: s.amsLocationId,
      active: s.active,
      config: s.config,
    })),
  });
});

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(createSchoolSchema),
  async (req: AuthRequest, res) => {
    const body = req.body as z.infer<typeof createSchoolSchema>;
    const existing = await prisma.school.findUnique({ where: { id: body.id } });
    if (existing) return res.status(409).json({ error: 'Schulnummer bereits vergeben' });
    const codeTaken = await prisma.school.findUnique({ where: { code: body.code } });
    if (codeTaken) return res.status(409).json({ error: 'KZ-OU (code) bereits vergeben' });

    const school = await prisma.school.create({
      data: {
        id: body.id,
        code: body.code,
        kzSnr: body.kzSnr?.trim() || null,
        name: body.name,
        type: body.type,
        location: body.location || null,
        active: body.active ?? true,
        config: (body.config as any) || {},
      },
    });
    logger.audit('School created', { schoolId: school.id, userId: req.user?.sub });
    res.status(201).json({ school });
  }
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(updateSchoolSchema),
  async (req: AuthRequest, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof updateSchoolSchema>;
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return res.status(404).json({ error: 'Schule nicht gefunden' });

    if (body.code && body.code !== school.code) {
      const codeTaken = await prisma.school.findUnique({ where: { code: body.code } });
      if (codeTaken) return res.status(409).json({ error: 'KZ-OU (code) bereits vergeben' });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.kzSnr !== undefined ? { kzSnr: body.kzSnr?.trim() || null } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.config !== undefined ? { config: body.config as any } : {}),
      },
    });
    logger.audit('School updated', { schoolId: id, userId: req.user?.sub });
    res.json({ school: updated });
  }
);

router.put(
  '/:id/config',
  requireAuth,
  requireRole('admin', 'operator'),
  async (req: AuthRequest, res) => {
    const id = req.params.id;
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return res.status(404).json({ error: 'Schule nicht gefunden' });
    const config = { ...(school.config as object), ...(req.body?.config || req.body || {}) };
    const updated = await prisma.school.update({ where: { id }, data: { config } });
    res.json({ school: updated });
  }
);

export default router;
