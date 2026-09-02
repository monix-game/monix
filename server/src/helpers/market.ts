import crypto from 'node:crypto';
import { resources } from '../../common/resources';

const TAU = Math.PI * 2;

const resourceById = new Map(resources.map(r => [r.id, r]));

// Deterministic pseudo-random values are cached so repeated price generation for
// the same seed (same resource + time bucket, recomputed by resource-history
// loops and price broadcasts) does not re-run SHA-256 every time. The cache is
// bounded: once it grows past a threshold it is simply cleared, since re-seeding
// a few hashes on the next tick is far cheaper than letting it grow unbounded.
const randCache = new Map<string, number>();
const RAND_CACHE_MAX = 100_000;

// Cache of computed prices per resourceId and 5-second bucket. Prices only ever
// change between buckets, so within a single bucket every caller (history,
// prices, initial snapshot) reuses the already-computed value instead of
// recomputing ~7 SHA-256 hashes each.
const priceByBucket = new Map<string, { bucket: number; price: number }>();

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

  const cached = priceByBucket.get(resourceId);
  if (cached && cached.bucket === bucket) return cached.price;

  const resourceBase = Math.max(resource.basePrice, 0.01);

  const time = bucket * interval;
  const baseFloor = Math.max(resourceBase, 1);

  const trendPeriodSeconds = 15 * 60; // 15 minutes
  const trendPhase = pseudoRandomFraction(`${resourceId}-trend-phase`) * TAU;
  const trendStrength = 0.1 + pseudoRandomFraction(`${resourceId}-trend-strength`) * 0.25; // 10% to 35%
  const trend = Math.sin((time / trendPeriodSeconds) * TAU + trendPhase) * trendStrength;

  const driftBucket = Math.floor(time / (12 * 60 * 60));
  const drift = smoothedNoise(`${resourceId}-drift`, driftBucket) * 0.15; // up to ±15%

  const microBucket = Math.floor(time / interval);
  const microStrength = 0.025 + 0.055 * Math.exp(-baseFloor / 200); // 2.5% to ~5.5%
  const micro = smoothedNoise(`${resourceId}-micro`, microBucket) * microStrength;

  let deviation = trend + drift + micro;

  const maxDeviation = 0.25 + 0.25 * Math.exp(-baseFloor / 150); // 25% to ~50%
  deviation = clamp(deviation, -maxDeviation, maxDeviation);

  let price = resourceBase * (1 + deviation);
  price = Math.max(price, 0.01); // Minimum price of 0.01

  priceByBucket.set(resourceId, { bucket, price });
  return price;
}
