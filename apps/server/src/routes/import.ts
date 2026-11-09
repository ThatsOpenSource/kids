import { Router } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { processXmlImport, commitImport } from '../services/importService';
import { validate } from '../middleware/validate';
import { importXmlPayloadSchema, importCommitSchema } from '../validation/schemas';
import { logger } from '../utils/logger';

const router = Router();

router.post(
  '/preview',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(importXmlPayloadSchema),
  async (req: AuthRequest, res) => {
    try {
      const { filename, contentBase64 } = req.body;
      const xml = Buffer.from(contentBase64, 'base64').toString('utf8');
      const preview = await processXmlImport(xml, filename, req.user!.sub);
      res.json(preview);
    } catch (err: any) {
      logger.error('Import preview failed', { err: String(err) });
      res.status(400).json({ error: err.message || 'Import fehlgeschlagen' });
    }
  }
);

router.post(
  '/commit',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(importCommitSchema),
  async (req: AuthRequest, res) => {
    try {
      const { persons, generatePasswords } = req.body;
      const result = await commitImport(req.user!.sub, persons, generatePasswords);
      res.json(result);
    } catch (err: any) {
      logger.error('Import commit failed', { err: String(err) });
      res.status(400).json({ error: err.message || 'Commit fehlgeschlagen' });
    }
  }
);

export default router;
