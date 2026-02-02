import crypto from 'node:crypto';
import { resources } from '../../common/resources';

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

/**
 * Generate a price for a resource at a given timestamp (rounded down to the nearest 5 seconds).
 * @param resourceId - The ID of the resource to generate the price for
 * @param timestamp - The timestamp to use as part of the seed for price generation
 * @returns The generated price for the resource at the given timestamp
 */
export function generatePrice(resourceId: string, timestamp: number): number {
  const resource = resources.find(v => v.id === resourceId);

  if (resource === undefined) return 0;

  const resourceBase = resource.basePrice;

  const interval = 5; // seconds
  timestamp = Math.floor(timestamp / interval) * interval;

  let frac = pseudoRandomFraction(`${resourceId}-${timestamp}`);
  frac = Number(frac.toFixed(4));

  let randomness = Math.round((90 + frac * 20) * 100) / 2000 - 5; // Centered around 0, range -4.5 to +4.5

  const multiplier = Math.round(resourceBase / 20);
  randomness *= Math.max(multiplier, 1);
  randomness = Number(randomness.toFixed(2));

  let price = resourceBase + randomness;
  price = Number(price.toFixed(2));
  price = Math.max(price, 0.01); // Minimum price of 0.01

  return price;
}
