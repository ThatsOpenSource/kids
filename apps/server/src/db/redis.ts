import { env } from '../config/env';
import { logger } from '../utils/logger';

type RedisLike = {
  ping: () => Promise<string>;
  quit: () => Promise<void>;
  get: (k: string) => Promise<string | null>;
  set: (k: string, v: string, ...args: unknown[]) => Promise<unknown>;
  del: (...ks: string[]) => Promise<number>;
};

let client: RedisLike | null = null;
let initAttempted = false;

/**
 * Returns a Redis client only when REDIS_ENABLED=true and connection succeeds.
 * Otherwise null – callers must work without cache/rate-store extras.
 */
export async function getRedis(): Promise<RedisLike | null> {
  if (!env.REDIS_ENABLED) return null;
  if (client) return client;
  if (initAttempted) return null;
  initAttempted = true;

  try {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    await redis.connect();
    await redis.ping();
    client = redis as unknown as RedisLike;
    logger.info('Redis connected', { url: env.REDIS_URL.replace(/\/\/.*@/, '//***@') });
    return client;
  } catch (err) {
    logger.warn('Redis unavailable – continuing without it', { err: String(err) });
    client = null;
    return null;
  }
}

export async function disconnectRedis() {
  if (client) {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    client = null;
  }
}
