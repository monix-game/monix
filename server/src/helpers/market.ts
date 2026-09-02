import crypto from 'node:crypto';
import { resources } from '../../common/resources';
import { getPriceMultiplier } from '../../common/market/news';

const TAU = Math.PI * 2;

const resourceById = new Map(resources.map(r => [r.id, r]));

// Deterministic pseudo-random values are cached so repeated price generation for
// the same seed (same resource + time bucket, recomputed by resource-history
// loops and price broadcasts) does not re-run SHA-256 every time. The cache is
// bounded: once it grows past a threshold it is simply cleared, since re-seeding
// a few hashes on the next tick is far cheaper than letting it grow unbounded.
const randCache = new Map<string, number>();
const RAND_CACHE_MAX = 100_000;

// Cache of computed prices per (resourceId, 5-second bucket). Prices only ever
// change between buckets, and history is generated in 720-bucket windows, so
// without this every 5s tick (and every graph/history build) recomputed the
// same ~700 hashes per resource from scratch. Keyed by bucket so history
// windows overlap mostly with cache hits instead of invalidating on each tick.
// Bounded: when it grows past a threshold it is simply cleared, since re-seeding
// a fresh bucket window on the next tick is far cheaper than unbounded growth.
const priceByBucket = new Map<string, { price: number }>();
const PRICE_CACHE_MAX = 30_000;

/**
 * Generates a pseudo-random fraction based on a seed string.
 * @param seed - The seed string to generate the pseudo-random number
 * @returns A pseudo-random number between 0 and 1 based on the provided seed
 */
function pseudoRandomFraction(seed: string): number {
  let cached = randCache.get(seed);
  if (cached !== undefined) return cached;
  if (randCache.size >= RAND_CACHE_MAX) randCache.clear();
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  // take first 8 hex chars -> 32-bit int
  const slice = hash.slice(0, 8);

  const int = Number.parseInt(slice, 16);
  cached = int / 0xffffffff;
  randCache.set(seed, cached);
  return cached;
}

function normalizedNoise(seed: string): number {
  return pseudoRandomFraction(seed) * 2 - 1;
}

function smoothedNoise(seedBase: string, bucket: number): number {
  const prev = normalizedNoise(`${seedBase}-${bucket - 1}`);
  const curr = normalizedNoise(`${seedBase}-${bucket}`);
  const next = normalizedNoise(`${seedBase}-${bucket + 1}`);
  return (prev + curr * 2 + next) / 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a price for a resource at a given timestamp (rounded down to the nearest 5 seconds).
 * @param resourceId - The ID of the resource to generate the price for
 * @param timestamp - The timestamp to use as part of the seed for price generation
 * @returns The generated price for the resource at the given timestamp
 */
export function generatePrice(resourceId: string, timestamp: number): number {
  const resource = resourceById.get(resourceId);

  if (resource === undefined) return 0;

  const interval = 5; // seconds
  const bucket = Math.floor(timestamp / interval);

  const cacheKey = `${resourceId}:${bucket}`;
  const cached = priceByBucket.get(cacheKey);
  if (cached) return cached.price;

  if (priceByBucket.size >= PRICE_CACHE_MAX) priceByBucket.clear();

  const resourceBase = Math.max(resource.basePrice, 0.01);

  const time = bucket * interval;
  const baseFloor = Math.max(resourceBase, 1);

  // Main trend wave plus a shorter harmonic so a trough never drags on too
  // long: 8-16 minute period, 14-32% amplitude with a 45% second harmonic.
  const trendPeriodSeconds = (8 + pseudoRandomFraction(`${resourceId}-trend-period`) * 8) * 60;
  const trendPhase = pseudoRandomFraction(`${resourceId}-trend-phase`) * TAU;
  const trendStrength = 0.14 + pseudoRandomFraction(`${resourceId}-trend-strength`) * 0.18;
  const trend =
    Math.sin((time / trendPeriodSeconds) * TAU + trendPhase) * trendStrength +
    Math.sin((time / (trendPeriodSeconds * 2.37)) * TAU + trendPhase * 1.31) *
      (trendStrength * 0.45);

  // Slow drift on a short window (4h buckets). Syncs between buckets, so an
  // unfavourable swing corrects itself across a session instead of pinning
  // the price down for days.
  const driftBucket = Math.floor(time / (4 * 60 * 60));
  const drift = smoothedNoise(`${resourceId}-drift`, driftBucket) * 0.12;

  // Triangular cycle (18-32 min) that always returns to baseline: the price
  // swings down and then climbs right back, so nothing stays "down forever".
  const pulsePeriodSeconds = (18 + pseudoRandomFraction(`${resourceId}-pulse-period`) * 14) * 60;
  const pulseProgress = (time % pulsePeriodSeconds) / pulsePeriodSeconds;
  const triangle = 2 * Math.abs(2 * pulseProgress - 1) - 1;
  const pulse = triangle * (0.12 + pseudoRandomFraction(`${resourceId}-pulse-strength`) * 0.18);

  // Occasional sharp event (usually a surge) that spikes then decays back to
  // baseline over ~5 minutes - big visible moves that keep it exciting and
  // always recover. One event window every 50-90 minutes per resource.
  const eventPeriodBuckets = (50 + pseudoRandomFraction(`${resourceId}-event-period`) * 40) * 12;
  const eventTailBuckets = 60; // 5 minutes of tail
  const eventProgress = bucket % eventPeriodBuckets;
  const eventStrength = 0.2 + pseudoRandomFraction(`${resourceId}-event-strength`) * 0.2; // 20-40%
  const eventSign =
    pseudoRandomFraction(`${resourceId}-event-sign-${Math.floor(bucket / eventPeriodBuckets)}`) >
    0.62
      ? -1
      : 1;
  const eventDecay = eventProgress < eventTailBuckets ? 1 - eventProgress / eventTailBuckets : 0;
  const eventBump = eventStrength * eventSign * eventDecay;

  // Small per-tick noise so the live price is never static on the graph, but
  // kept subtle so trend/pulse/event movement reads as real directional runs
  // instead of a jagged comb that flips direction every tick.
  const microStrength = 0.008 + 0.01 * Math.exp(-baseFloor / 200);
  const micro = smoothedNoise(`${resourceId}-micro`, Math.floor(time / interval)) * microStrength;

  let deviation = trend + drift + pulse + eventBump + micro;

  const maxDeviation = 0.75; // up to ±75% before the news multiplier
  deviation = clamp(deviation, -maxDeviation, maxDeviation);

  let price = resourceBase * (1 + deviation) * getPriceMultiplier(resourceId, time);
  price = clamp(price, 0.01, resourceBase * 3); // Minimum price of 0.01, cap at 3x base

  priceByBucket.set(cacheKey, { price });
  return price;
}
