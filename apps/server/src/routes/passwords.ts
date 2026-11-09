import { Router } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { requireStepUp } from '../middleware/stepUp';
import { validate } from '../middleware/validate';
import { passwordScopeSchema } from '../validation/schemas';
import {
  generatePasswordsForScope,
  revealPasswordsForScope,
} from '../services/personPasswordService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

const stepUpPasswordSchema = passwordScopeSchema.extend({
  confirmPassword: z.string().min(8).max(128),
  totpCode: z.string().min(6).max(8).optional(),
});

router.post(
  '/generate',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(stepUpPasswordSchema),
  requireStepUp,
  async (req: AuthRequest, res) => {
    try {
      const result = await generatePasswordsForScope(req.user!.sub, req.body);
      res.json(result);
    } catch (err: any) {
      logger.error('Password generate failed', { err: String(err) });
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/reveal',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(stepUpPasswordSchema),
  requireStepUp,
  async (req: AuthRequest, res) => {
    try {
      const result = await revealPasswordsForScope(req.user!.sub, req.body);
      res.json(result);
    } catch (err: any) {
      logger.error('Password reveal failed', { err: String(err) });
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
