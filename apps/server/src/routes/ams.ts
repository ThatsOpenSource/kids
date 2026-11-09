import { Router } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { generateAmsExport, ensureAppleIds } from '../services/amsService';
import { validate } from '../middleware/validate';
import { amsExportSchema, appleIdsSchema } from '../validation/schemas';
import { logger } from '../utils/logger';

const router = Router();

router.post(
  '/export',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(amsExportSchema),
  async (req: AuthRequest, res) => {
    try {
      const { schoolId, ensureAppleIdsFirst } = req.body;
      if (ensureAppleIdsFirst) await ensureAppleIds(schoolId);
      const pack = await generateAmsExport(req.user!.sub, schoolId);
      res.json(pack);
    } catch (err: any) {
      logger.error('AMS export failed', { err: String(err) });
      res.status(400).json({ error: err.message || 'AMS-Export fehlgeschlagen' });
    }
  }
);

router.post(
  '/apple-ids',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(appleIdsSchema),
  async (req: AuthRequest, res) => {
    try {
      const count = await ensureAppleIds(req.body.schoolId);
      res.json({ generated: count });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
