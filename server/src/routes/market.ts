import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { resources } from '../../common/resources';
import { requireAuth } from '../middleware';

const router = Router();

let prevPrices: { id: string; price: number }[] = [];

function pseudoRandomFraction(seed: string): number {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  // take first 8 hex chars -> 32-bit int
  const slice = hash.slice(0, 8);

  const int = parseInt(slice, 16);
  return int / 0xffffffff;
}

function generatePrice(resourceId: string, timestamp: number): number {
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

router.get('/price/:resourceId', requireAuth, (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const price = generatePrice(resourceId, Math.floor(Date.now() / 1000));
  const price_data = { resource_id: resourceId, price };
  return res.status(200).json({ success: true, data: price_data });
});

router.get('/prices', requireAuth, (req: Request, res: Response) => {
  const prices = resources.map(r => {
    const price = generatePrice(r.id, Math.floor(Date.now() / 1000));
    return { resource_id: r.id, price };
  });
  return res.status(200).json({ success: true, data: prices });
});

router.get('/history/:resourceId', requireAuth, (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const hoursBack = Number(req.query.hours_back || 2);
  const currentTime = Math.floor(Date.now() / 1000);
  const history: Array<{ time: number; price: number }> = [];

  const totalPoints = Math.max(0, Math.floor(hoursBack) * 3600);
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = currentTime - i * 1;
    history.push({ time: timestamp, price: generatePrice(resourceId, timestamp) });
  }
  history.reverse();
  return res.status(200).json({ success: true, data: history });
});

export default router;
