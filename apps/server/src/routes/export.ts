import { Router } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { requireStepUp } from '../middleware/stepUp';
import { validate } from '../middleware/validate';
import { csvExportSchema } from '../validation/schemas';
import { exportPersonsCsv } from '../services/csvExportService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * CSV export – school or class scoped.
 * Requires step-up: confirmPassword (+ totpCode if 2FA enabled).
 */
router.post(
  '/csv',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(csvExportSchema),
  requireStepUp,
  async (req: AuthRequest, res) => {
    try {
      const { schoolId, klasse, includeHeaders, columns } = req.body;
      const result = await exportPersonsCsv(req.user!.sub, {
        schoolId,
        klasse,
        includeHeaders,
        columns,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('X-Export-Count', String(result.count));
      // Also allow JSON mode via Accept
      if (req.headers.accept?.includes('application/json')) {
        return res.json({
          filename: result.filename,
          count: result.count,
          csv: result.csv,
        });
      }
      res.send(result.csv);
    } catch (err: any) {
      logger.error('CSV export failed', { err: String(err) });
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
