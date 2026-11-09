import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '@kids/shared';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    logger.security('Missing auth header', { ip: req.ip, path: req.path });
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    // Optional device binding
    const deviceFp = req.headers['x-device-fingerprint'] as string | undefined;
    if (payload.deviceFingerprint && deviceFp && payload.deviceFingerprint !== deviceFp) {
      logger.security('Device fingerprint mismatch', { userId: payload.sub, ip: req.ip });
      return res.status(401).json({ error: 'Gerätebindung ungültig' });
    }
    req.user = payload;
    next();
  } catch {
    logger.security('Invalid JWT', { ip: req.ip, path: req.path });
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    next();
  };
}
