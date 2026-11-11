import Redis from "ioredis";

let client: Redis | null = null;
let ready = false;

export async function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return;
  try {
    client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true, retryStrategy: () => null });
    client.on("error", () => {});
    await client.connect();
    await client.ping();
    ready = true;
    console.log("Redis connected");
  } catch {
    client?.disconnect();
    client = null;
    ready = false;
    console.log("Redis unavailable, caching disabled");
  }
}

export function isRedisReady() { return ready; }

export async function cacheGet(key: string): Promise<any | null> {
  if (!ready || !client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: any, ttl = 300) {
  if (!ready || !client) return;
  try { await client.set(key, JSON.stringify(value), "EX", ttl); } catch {}
}

export async function cacheInvalidate(pattern: string) {
  if (!ready || !client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(...keys);
  } catch {}
}