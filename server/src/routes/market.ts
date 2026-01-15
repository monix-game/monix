import { Router, Request, Response } from 'express';
import { resources } from '../../common/resources';
import { requireAuth } from '../middleware';
import { generatePrice } from '../helpers/market';

const router = Router();

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
