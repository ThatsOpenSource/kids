import express from 'express';
import { env } from './config/env';
import { securityMiddleware, apiRateLimiter, sanitizeBody } from './middleware/security';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import importRoutes from './routes/import';
import personRoutes from './routes/persons';
import schoolRoutes from './routes/schools';
import amsRoutes from './routes/ams';
import passwordRoutes from './routes/passwords';
import exportRoutes from './routes/export';
import { prisma, disconnectPrisma } from './db/prisma';
import fs from 'fs';
import path from 'path';

const app = express();

app.set('trust proxy', 1);
app.use(...securityMiddleware);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(apiRateLimiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'kids-server', db: 'up', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'kids-server', db: 'down' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/import', importRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/ams', amsRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/export', exportRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { err: String(err), stack: err?.stack });
  res.status(500).json({ error: 'Interner Serverfehler' });
});

async function bootstrap() {
  const logDir = path.resolve(env.LOG_DIR);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  try {
    await prisma.$connect();
    logger.info('Prisma connected');
  } catch (e) {
    logger.warn('Prisma connect failed – start Postgres and run: bunx prisma db push', {
      err: String(e),
    });
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`KIDS server listening on :${env.PORT}`, { env: env.NODE_ENV });
  });

  const shutdown = async () => {
    logger.info('Shutting down…');
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { err: String(err) });
  process.exit(1);
});
