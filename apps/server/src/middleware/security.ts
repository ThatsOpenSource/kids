import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cors from 'cors';
import xss from 'xss';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }),
  compression(),
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
  }),
  hpp(),
];

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen – bitte später erneut versuchen' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Zu viele Login-Versuche' },
});

/** Simple XSS sanitization for string body fields */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    const walk = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        const v = obj[key];
        if (typeof v === 'string') {
          obj[key] = xss(v);
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as Record<string, unknown>);
        }
      }
    };
    walk(req.body);
  }
  next();
}
