import crypto from 'node:crypto';
import { resources } from '../../common/resources';

const TAU = Math.PI * 2;

/**
 * Generates a pseudo-random fraction based on a seed string.
 * @param seed - The seed string to generate the pseudo-random number
 * @returns A pseudo-random number between 0 and 1 based on the provided seed
 */
function pseudoRandomFraction(seed: string): number {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  // take first 8 hex chars -> 32-bit int
  const slice = hash.slice(0, 8);

  const int = Number.parseInt(slice, 16);
  return int / 0xffffffff;
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
  const resource = resources.find(v => v.id === resourceId);

  if (resource === undefined) return 0;

  const resourceBase = Math.max(resource.basePrice, 0.01);

  const interval = 5; // seconds
  timestamp = Math.floor(timestamp / interval) * interval;

  const time = timestamp;
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

  return price;
}
