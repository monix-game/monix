import crypto from 'crypto';
import { resources } from '../../common/resources';

function pseudoRandomFraction(seed: string): number {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  // take first 8 hex chars -> 32-bit int
  const slice = hash.slice(0, 8);

  const int = parseInt(slice, 16);
  return int / 0xffffffff;
}

export function generatePrice(resourceId: string, timestamp: number): number {
  const resource = resources.find(v => v.id === resourceId);

  if (resource === undefined) return 0.0;

  const resourceBase = resource.basePrice;

  let frac = pseudoRandomFraction(`${resourceId}-${timestamp}`);
  frac = Number(frac.toFixed(4));

  let randomness = Math.round((90 + frac * 20) * 100) / 2000 - 5; // Centered around 0, range -4.5 to +4.5

  const multiplier = Math.round(resourceBase / 20);
  randomness *= multiplier >= 1 ? multiplier : 1;
  randomness = Number(randomness.toFixed(2));

  let price = resourceBase + randomness;
  price = Number(price.toFixed(2));
  price = Math.max(price, 0.01); // Minimum price of 0.01

  return price;
}
