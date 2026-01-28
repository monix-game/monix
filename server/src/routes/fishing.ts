import { Router } from 'express';
import { requireActive } from '../middleware';
import { getUserByUUID, updateUser } from '../db';
import { type IUser } from '../../common/models/user';
import { fishingRods } from '../../common/fishing/fishingRods';
import { fishingBaits } from '../../common/fishing/fishingBait';
import { getAquariumUpgradeCost } from '../helpers/fishing';

const router = Router();

router.get('/aquarium', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const aquarium = user.fishing?.aquarium || { capacity: 10, fish: [] };

  return res.status(200).json({ aquarium });
});

router.post('/aquarium/upgrade', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Initialize fishing data if not present
  user.fishing ??= {
    aquarium: { capacity: 10, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  const currentCapacity = user.fishing.aquarium.capacity;
  const upgradeCost = getAquariumUpgradeCost(currentCapacity / 10 - 1); // Assuming each level increases capacity by 10

  if (user.money < upgradeCost) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  // Deduct money and upgrade aquarium capacity
  user.money -= upgradeCost;
  user.fishing.aquarium.capacity += 10;

  await updateUser(user);

  return res.status(200).json({
    message: 'Aquarium upgraded successfully',
    money: user.money,
    aquarium_capacity: user.fishing.aquarium.capacity,
  });
});

router.post('/buy/rod', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { rod_id } = req.body as { rod_id: string };

  if (!rod_id) {
    return res.status(400).json({ error: 'rod_id is required' });
  }

  if (typeof rod_id !== 'string') {
    return res.status(400).json({ error: 'rod_id must be a string' });
  }

  const rod = fishingRods.find(r => r.id === rod_id);

  if (!rod) {
    return res.status(400).json({ error: 'Invalid rod_id' });
  }

  if (user.money < rod.price) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  // Initialize fishing data if not present
  user.fishing ??= {
    aquarium: { capacity: 10, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  user.fishing.rods_owned ??= [];

  // Check if user already owns the rod
  if (user.fishing.rods_owned.includes(rod_id)) {
    return res.status(400).json({ error: 'You already own this rod' });
  }

  // Deduct money and add rod to user's owned rods
  user.money -= rod.price;
  user.fishing.rods_owned.push(rod_id);

  await updateUser(user);

  return res.status(200).json({
    message: 'Rod purchased successfully',
    money: user.money,
    rods_owned: user.fishing.rods_owned,
  });
});

router.get('/rods', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const rods_owned = user.fishing?.rods_owned || [];

  return res.status(200).json({ rods_owned });
});

router.post('/equip/rod', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { rod_id } = req.body as { rod_id: string };

  if (!rod_id) {
    return res.status(400).json({ error: 'rod_id is required' });
  }

  if (typeof rod_id !== 'string') {
    return res.status(400).json({ error: 'rod_id must be a string' });
  }

  const rod = fishingRods.find(r => r.id === rod_id);

  if (!rod) {
    return res.status(400).json({ error: 'Invalid rod_id' });
  }

  if (!user.fishing?.rods_owned?.includes(rod_id)) {
    return res.status(400).json({ error: 'You do not own this rod' });
  }

  // Equip the rod
  user.fishing.equipped_rod = rod_id;

  await updateUser(user);

  return res.status(200).json({
    message: 'Rod equipped successfully',
    equipped_rod: user.fishing.equipped_rod,
  });
});

router.post('/buy/bait', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { bait_id, quantity } = req.body as { bait_id: string; quantity: number };

  if (!bait_id) {
    return res.status(400).json({ error: 'bait_id is required' });
  }

  if (typeof bait_id !== 'string') {
    return res.status(400).json({ error: 'bait_id must be a string' });
  }

  if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }

  // Initialize fishing data if not present
  user.fishing ??= {
    aquarium: { capacity: 10, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  user.fishing.bait_owned ??= {};

  const bait = fishingBaits.find(b => b.id === bait_id);

  if (!bait) {
    return res.status(400).json({ error: 'Invalid bait_id' });
  }

  const totalPrice = bait.price * quantity;

  if (user.money < totalPrice) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  // Deduct money and add bait to user's owned bait
  user.money -= totalPrice;
  user.fishing.bait_owned[bait_id] = (user.fishing.bait_owned[bait_id] || 0) + quantity;

  await updateUser(user);

  return res.status(200).json({
    message: 'Bait purchased successfully',
    money: user.money,
    bait_owned: user.fishing.bait_owned,
  });
});

router.get('/baits', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const bait_owned = user.fishing?.bait_owned || {};

  return res.status(200).json({ bait_owned });
});

router.post('/equip/bait', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { bait_id } = req.body as { bait_id: string };

  if (!bait_id) {
    return res.status(400).json({ error: 'bait_id is required' });
  }

  if (typeof bait_id !== 'string') {
    return res.status(400).json({ error: 'bait_id must be a string' });
  }

  const bait = fishingBaits.find(b => b.id === bait_id);

  if (!bait) {
    return res.status(400).json({ error: 'Invalid bait_id' });
  }

  if (!user.fishing?.bait_owned?.[bait_id] || user.fishing.bait_owned[bait_id] <= 0) {
    return res.status(400).json({ error: 'You do not own this bait' });
  }

  // Equip the bait
  user.fishing.equipped_bait = bait_id;

  await updateUser(user);

  return res.status(200).json({
    message: 'Bait equipped successfully',
    equipped_bait: user.fishing.equipped_bait,
  });
});

export default router;
