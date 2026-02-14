import { Router } from 'express';
import { requireActive, requireFeatureEnabled } from '../middleware';
import { getUserByUUID, updateUser } from '../db';
import { type IUser } from '../models/user';
import { generatePrice } from '../helpers/market';
import { resources } from '../../common/resources';

const router = Router();

router.use(requireFeatureEnabled('resourcesMarket'));

router.get('/all', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userResources: { [key: string]: number } = {};

  for (const resource of resources) {
    userResources[resource.id] = 0;
  }

  if (user.resources) {
    for (const resourceId of Object.keys(user.resources)) {
      userResources[resourceId] = user.resources[resourceId];
    }
  }

  return res.status(200).json({ resources: userResources });
});

router.get('/:resourceId', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const resourceId = req.params.resourceId;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const quantity = user.resources ? user.resources[resourceId as string] || 0 : 0;

  return res.status(200).json({ resourceId, quantity });
});

router.post('/:resourceId/buy', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const resourceId = req.params.resourceId;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const resourcePrice = generatePrice(resourceId as string, Math.floor(Date.now() / 1000));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const quantityToBuy: number = Number(req.body.quantity || 0);

  if (Number.isNaN(quantityToBuy) || quantityToBuy <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  const totalCost = resourcePrice * quantityToBuy;

  if (user.money === undefined || user.money < totalCost) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct balance and add resources
  user.money -= totalCost;
  if (!user.resources) {
    user.resources = {};
  }

  user.resources[resourceId as string] =
    (user.resources[resourceId as string] || 0) + quantityToBuy;

  await updateUser(user);

  return res.status(200).json({
    message: 'Purchase successful',
    resourceId,

    quantity: user.resources[resourceId as string],
    money: user.money,
  });
});

router.post('/:resourceId/sell', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const resourceId = req.params.resourceId;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const resourcePrice = generatePrice(resourceId as string, Math.floor(Date.now() / 1000));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const quantityToSell: number = Number(req.body.quantity || 0);

  if (Number.isNaN(quantityToSell) || quantityToSell <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  const totalValue = resourcePrice * quantityToSell;

  const currentQuantity = user.resources ? user.resources[resourceId as string] || 0 : 0;
  if (user.resources === undefined || currentQuantity < quantityToSell) {
    return res.status(400).json({ error: 'Insufficient resources to sell' });
  }

  // Deduct resources and add balance

  user.resources[resourceId as string] = currentQuantity - quantityToSell;
  user.money = (user.money || 0) + Number(totalValue);

  await updateUser(user);

  return res.status(200).json({
    message: 'Sale successful',
    resourceId,

    quantity: user.resources[resourceId as string],
    money: user.money,
  });
});

export default router;
