import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma;
  // @ts-expect-error prisma event typing
  prisma.$on('query', (e: { duration: number; query: string }) => {
    if (e.duration > 200) {
      logger.warn('Slow Prisma query', { duration: e.duration, query: e.query.slice(0, 160) });
    }
  });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
