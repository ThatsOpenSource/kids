import { Router } from 'express';
import {
  login,
  loginWithTotp,
  completeTotpSetupAndLogin,
  registerUser,
  refreshAccessToken,
  revokeRefreshToken,
  getUserTotpStatus,
} from '../services/authService';
import { beginTotpSetup, confirmTotpSetup, disableTotp } from '../services/totpService';
import { authRateLimiter } from '../middleware/security';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  registerUserSchema,
  refreshSchema,
  loginWithTotpSchema,
  totpCodeSchema,
} from '../validation/schemas';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

const setupCompleteSchema = z.object({
  setupToken: z.string().min(20),
  totpCode: z.string().min(6).max(8).regex(/^\d{6,8}$/),
  deviceFingerprint: z.string().max(256).optional(),
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req, res) => {
  try {
    res.json(await login(req.body));
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login fehlgeschlagen' });
  }
});

router.post('/login/totp', authRateLimiter, validate(loginWithTotpSchema), async (req, res) => {
  try {
    const { preAuthToken, totpCode, deviceFingerprint } = req.body;
    res.json(await loginWithTotp(preAuthToken, totpCode, deviceFingerprint));
  } catch (err: any) {
    res.status(401).json({ error: err.message || '2FA fehlgeschlagen' });
  }
});

/** Mandatory first-time 2FA: confirm code with setupToken → full session */
router.post('/login/setup-2fa', authRateLimiter, validate(setupCompleteSchema), async (req, res) => {
  try {
    const { setupToken, totpCode, deviceFingerprint } = req.body;
    res.json(await completeTotpSetupAndLogin(setupToken, totpCode, deviceFingerprint));
  } catch (err: any) {
    res.status(400).json({ error: err.message || '2FA-Einrichtung fehlgeschlagen' });
  }
});

router.post(
  '/register',
  authRateLimiter,
  requireAuth,
  requireRole('admin'),
  validate(registerUserSchema),
  async (req: AuthRequest, res) => {
    try {
      res.status(201).json(await registerUser(req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  try {
    const { refreshToken, deviceFingerprint } = req.body;
    res.json(await refreshAccessToken(refreshToken, deviceFingerprint));
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) await revokeRefreshToken(refreshToken);
    logger.audit('Logout', { userId: req.user?.sub });
  } catch {
    /* ignore */
  }
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const status = await getUserTotpStatus(req.user!.sub);
  res.json({ user: req.user, totpEnabled: status?.totpEnabled ?? false });
});

router.post('/2fa/setup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await beginTotpSetup(req.user!.sub, req.user!.email);
    res.json({ qrDataUrl: result.qrDataUrl, secret: result.secret });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/2fa/confirm', requireAuth, validate(totpCodeSchema), async (req: AuthRequest, res) => {
  try {
    const ok = await confirmTotpSetup(req.user!.sub, req.body.totpCode);
    if (!ok) return res.status(400).json({ error: 'Code ungültig' });
    res.json({ ok: true, totpEnabled: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/2fa/disable', requireAuth, async (_req, res) => {
  res.status(403).json({
    error: '2FA kann nicht deaktiviert werden. Bitte über „2FA neu einrichten“ ersetzen.',
    code: 'TOTP_DISABLE_FORBIDDEN',
  });
});

export default router;
