import { Router, Request, Response } from "express";
import crypto from "crypto";
import { resources } from "../../common/resources";

const router = Router();

function pseudoRandomFraction(seed: string): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  // take first 8 hex chars -> 32-bit int
  const slice = hash.slice(0, 8);
  const int = parseInt(slice, 16);
  return int / 0xffffffff;
}

function generatePrice(resourceId: string, timestamp: number): number {
  const frac = pseudoRandomFraction(`${resourceId}-${timestamp}`);
  return Math.round((90 + frac * 20) * 100) / 100;
}

router.get("/price/:resourceId", (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const price = generatePrice(resourceId, Math.floor(Date.now() / 1000));
  const price_data = { resource_id: resourceId, price };
  return res.status(200).json({ success: true, data: price_data });
});

router.get("/prices", (req: Request, res: Response) => {
  const prices = resources.map((r) => {
    const price = generatePrice(r.id, Math.floor(Date.now() / 1000));
    return { resource_id: r.id, price };
  });
  return res.status(200).json({ success: true, data: prices });
});

router.get("/history/:resourceId", (req: Request, res: Response) => {
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
