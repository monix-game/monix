import crypto from 'crypto';
import { resources } from '../../common/resources';

let prevPrices: { id: string; price: number }[] = [];

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
  const volatility = resourceBase > 1500 ? Math.min(4, Math.floor((resourceBase - 500) / 2000)) : 0;

  const frac = pseudoRandomFraction(`${resourceId}-${timestamp}`);

  const price = resourceBase + Math.round((90 + frac * 20) * 100) / 100;
  let priceWithVolatility = price;

  const prevPrice = prevPrices.find(v => v.id === resourceId);
  if (volatility > 0 && prevPrice !== undefined) {
    const difference = price - prevPrice.price;
    priceWithVolatility = Number((prevPrice.price + difference * volatility).toFixed(2));
  }

  prevPrices = prevPrices.filter(value => value.id !== resourceId);
  prevPrices.push({ id: resourceId, price: price });

  return priceWithVolatility;
}
