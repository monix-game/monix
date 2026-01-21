import { Router, Request, Response } from 'express';
import { resources } from '../../common/resources';
import { requireAuth } from '../middleware';
import { generatePrice } from '../helpers/market';

const router = Router();

router.get('/price/:resourceId', requireAuth, (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const { timestamp } = req.query;

  let time = Math.floor(Date.now() / 1000);
  if (timestamp) {
    const tsNum = Number(timestamp);
    if (!isNaN(tsNum)) {
      time = tsNum;
    }
  }

  const price = Number(generatePrice(resourceId as string, time).toFixed(2));
  const price_data = { resource_id: resourceId, price };
  return res.status(200).json({ success: true, data: price_data });
});

router.get('/prices', requireAuth, (req: Request, res: Response) => {
  const { timestamp } = req.query;

  let time = Math.floor(Date.now() / 1000);
  if (timestamp) {
    const tsNum = Number(timestamp);
    if (!isNaN(tsNum)) {
      time = tsNum;
    }
  }

  const prices = resources.map(r => {
    const price = Number(generatePrice(r.id, time).toFixed(2));
    return { resource_id: r.id, price };
  });
  return res.status(200).json({ success: true, data: prices });
});

router.get('/history/:resourceId', requireAuth, (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const hoursBack = Number(req.query.hours_back || 2);
  const currentTime = Math.floor(Date.now() / 1000);
  const history: Array<{ time: number; price: number }> = [];

  const totalPoints = Math.max(0, Math.floor(hoursBack) * 1800);
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = currentTime - i * 2;

    history.push({ time: timestamp, price: generatePrice(resourceId as string, timestamp) });
  }
  history.reverse();
  return res.status(200).json({ success: true, data: history });
});

export default router;
