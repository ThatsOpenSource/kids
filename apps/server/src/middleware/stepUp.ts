import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import { prisma } from '../db/prisma';
import { verifyPassword } from '../utils/crypto';
import { verifyTotp } from '../services/totpService';
import { logger } from '../utils/logger';

/**
 * Require re-entered account password (+ TOTP if enabled) for high-scope actions.
 * Expects body.confirmPassword and optionally body.totpCode.
 */
export async function requireStepUp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const password = (req.body?.confirmPassword ?? req.body?.password) as string | undefined;
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(403).json({
        error: 'Passwort-Bestätigung erforderlich',
        code: 'STEP_UP_PASSWORD_REQUIRED',
      });
    }

    const user = await prisma.appUser.findUnique({ where: { id: userId } });
    if (!user || !user.active) return res.status(401).json({ error: 'Konto ungültig' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      logger.security('Step-up password failed', { userId, path: req.path });
      return res.status(403).json({ error: 'Passwort falsch', code: 'STEP_UP_PASSWORD_INVALID' });
    }

    if (user.totpEnabled) {
      const code = (req.body?.totpCode ?? req.body?.otp) as string | undefined;
      if (!code) {
        return res.status(403).json({
          error: '2FA-Code erforderlich',
          code: 'STEP_UP_TOTP_REQUIRED',
        });
      }
      const totpOk = await verifyTotp(userId, code);
      if (!totpOk) {
        logger.security('Step-up TOTP failed', { userId, path: req.path });
        return res.status(403).json({ error: '2FA-Code ungültig', code: 'STEP_UP_TOTP_INVALID' });
      }
    }

    next();
  } catch (err: any) {
    logger.error('Step-up error', { err: String(err) });
    return res.status(500).json({ error: 'Step-up Prüfung fehlgeschlagen' });
  }
}
