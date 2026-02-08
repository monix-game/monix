import { Router } from 'express';
import { requireActive } from '../middleware';
import { getUserByUUID, updateUser } from '../db';
import { type IUser } from '../../common/models/user';
import { fishingRods } from '../../common/fishing/fishingRods';
import { fishingBaits } from '../../common/fishing/fishingBait';
import { calculateFishingResult, getFishValue } from '../../common/fishing/fishing';
import { getAquariumUpgradeCost } from '../helpers/fishing';
import { IFish } from '../models/fish';
import { v4 } from 'uuid';

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

router.post('/aquarium/sell', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { fish_id } = req.body as { fish_id: string };

  if (!fish_id) {
    return res.status(400).json({ error: 'fish_id is required' });
  }

  if (typeof fish_id !== 'string') {
    return res.status(400).json({ error: 'fish_id must be a string' });
  }

  const fishIndex = user.fishing?.aquarium.fish.findIndex(f => f.uuid === fish_id);

  if (fishIndex === undefined || fishIndex === -1) {
    return res.status(400).json({ error: 'Fish not found in aquarium' });
  }

  // Initialize fishing data if not present
  user.fishing ??= {
    aquarium: { capacity: 10, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  const fish = user.fishing.aquarium.fish[fishIndex];
  const value = getFishValue(fish);

  // Remove fish from aquarium and add money to user
  user.fishing.aquarium.fish.splice(fishIndex, 1);
  user.money += value;

  await updateUser(user);

  return res.status(200).json({
    message: 'Fish sold successfully',
    money: user.money,
    soldFor: value,
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

router.post('/fish', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const baitId = user.fishing?.equipped_bait || null;
  const rodId = user.fishing?.equipped_rod || 'damaged-rod';

  const fishingResult = calculateFishingResult(baitId, rodId);

  // Add caught fish to user's aquarium if there is capacity
  user.fishing ??= {
    aquarium: { capacity: 10, fish: [] },
    bait_owned: {},
    fish_caught: {},
    rods_owned: [],
  };

  const fish: IFish = {
    uuid: v4(),
    user_uuid: user.uuid,
    type: fishingResult.fish_type,
    weight: fishingResult.weight,
    caught_at: fishingResult.timestamp,
  };

  let addedToAquarium = false;
  if (user.fishing.aquarium.fish.length < user.fishing.aquarium.capacity) {
    user.fishing.aquarium.fish.push(fish);
    addedToAquarium = true;
  } else {
    // Immediately sell the fish for money if aquarium is full
    const value = getFishValue(fish);
    user.money += value;
  }

  // Update fish caught count
  user.fishing.fish_caught ??= {};
  user.fishing.fish_caught[fishingResult.fish_type] =
    (user.fishing.fish_caught[fishingResult.fish_type] || 0) + 1;

  // Consume bait if used
  if (baitId) {
    user.fishing.bait_owned ??= {};
    if (user.fishing.bait_owned[baitId] && user.fishing.bait_owned[baitId] > 0) {
      user.fishing.bait_owned[baitId] -= 1;
    }

    // If bait runs out, unequip it
    if (user.fishing.bait_owned[user.fishing.equipped_bait ?? ''] <= 0) {
      user.fishing.equipped_bait = undefined;
    }
  }

  await updateUser(user);

  return res.status(200).json({
    fishingResult,
    fishCaught: fish,
    addedToAquarium,
    soldFor: addedToAquarium ? 0 : getFishValue(fish),
  });
});

export default router;
