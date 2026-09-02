import Redis from 'ioredis';
import { REDIS_URL } from './constants';
import { createLogger } from './logging';

const log = createLogger('redis');

let client: Redis | null = null;

export async function connectRedis(): Promise<void> {
  try {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on('error', (err: Error) => {
      log.debug({ err: err.message }, 'Redis connection error');
    });

    client.on('connect', () => {
      log.info('Redis connected');
    });

    await client.connect();
  } catch (err) {
    log.warn({ err }, 'Redis unavailable, running without cache');
    client = null;
  }
}

export function getRedis(): Redis | null {
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

// ---------------------------------------------------------------------------
// Typed cache helpers
// ---------------------------------------------------------------------------

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Non-critical; ignore.
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // Non-critical; ignore.
  }
}
