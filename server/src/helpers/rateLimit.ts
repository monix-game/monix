import { Elysia } from 'elysia';
import { getRequestIp, type HeaderMap } from './ip';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator: (headers: HeaderMap, ip?: string) => string;
  message: { error: string };
  skip?: (pathname: string) => boolean;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type StoreKey = { windowMs: number; max: number; keyGenerator: string };
const stores = new Map<StoreKey, Map<string, RateLimitEntry>>();

function storeKeyFor(options: RateLimitOptions): StoreKey {
  return { windowMs: options.windowMs, max: options.max, keyGenerator: options.keyGenerator.name };
}

const MAX_STORE_ENTRIES = 25_000;

function hitLimit(
  options: RateLimitOptions,
  key: string,
  now: number
): { allowed: boolean; resetAt: number } {
  const storeKey = storeKeyFor(options);
  let store = stores.get(storeKey);
  if (!store) {
    store = new Map<string, RateLimitEntry>();
    stores.set(storeKey, store);
  }

  // Opportunistic pruning so unbounded unique keys (per-IP fingerprints) can't
  // grow the maps forever under a burst of distinct clients.
  if (store.size >= MAX_STORE_ENTRIES) {
    for (const [storedKey, entry] of store) {
      if (entry.resetAt <= now) store.delete(storedKey);
    }
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, resetAt: now + options.windowMs };
  }

  entry.count += 1;
  if (entry.count > options.max) {
    return { allowed: false, resetAt: entry.resetAt };
  }
  return { allowed: true, resetAt: entry.resetAt };
}

export function buildRateLimitKey(headers: HeaderMap, ip?: string): string {
  const userAgent = headers['user-agent'] || 'unknown-ua';
  const acceptLanguage = headers['accept-language'] || 'unknown-lang';
  const forwardedProto = headers['x-forwarded-proto'] || 'unknown-proto';

  const key = `${ip || 'unknown-ip'}:anonymous:${userAgent}:${acceptLanguage}:${forwardedProto}`;

  return key;
}

/**
 * Returns an Elysia plugin that applies a rate limit to a request.
 */
export function rateLimit(options: RateLimitOptions) {
  return new Elysia().onBeforeHandle(({ request, set, headers }) => {
    const pathname = new URL(request.url).pathname;
    if (options.skip?.(pathname)) {
      return;
    }

    const ip = getRequestIp(headers);
    const key = options.keyGenerator(headers, ip);
    const now = Date.now();

    const { allowed, resetAt } = hitLimit(options, key, now);

    if (!allowed) {
      set.status = 429;
      set.headers['retry-after'] = String(Math.ceil((resetAt - now) / 1000));
      return options.message;
    }
  });
}
