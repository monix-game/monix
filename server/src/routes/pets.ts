import { Router } from 'express';
import { requireActive, requireFeatureEnabled } from '../middleware';
import {
  createPet,
  deletePetByUUID,
  getPetByUUID,
  getPetsByOwnerUUID,
  getUserByUUID,
  updatePet,
  updateUser,
} from '../db';
import { type IUser } from '../../common/models/user';
import { type IPet, petToDoc } from '../../common/models/pet';
import { petTypes } from '../../common/petTypes';
import { v4 } from 'uuid';
import {
  calculateHunger,
  canFeedPet,
  canLevelUpPet,
  canPlayWithPet,
  isPetAsleep,
} from '../../common/pet';
import { hasGems } from '../../common/math';

const router = Router();

router.use(requireFeatureEnabled('pets'));

const FEED_COSTS: { [key: string]: number } = {
  standard: 20,
  premium: 50,
};

const FEED_EXP: { [key: string]: number } = {
  standard: 10,
  premium: 25,
};

const PET_SLOT_COST = 50;
const PET_SLOT_MIN = 3;
const PET_SLOT_MAX = 10;

function getPetSlotLimit(user: IUser): number {
  const rawSlots = typeof user.pet_slots === 'number' ? user.pet_slots : PET_SLOT_MIN;
  return Math.min(Math.max(rawSlots, PET_SLOT_MIN), PET_SLOT_MAX);
}

async function updatePlayersPets(user_uuid: string) {
  const pets = await getPetsByOwnerUUID(user_uuid);
  for (const pet of pets) {
    const hunger = calculateHunger(pet.time_last_fed);
    if (hunger >= 100) {
      // Pet is starving, it dies
      pet.is_dead = true;
      await updatePet(pet);
    }
  }
}

router.get('/all', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await updatePlayersPets(user_uuid);

  const pets = (await getPetsByOwnerUUID(user_uuid)).map(petToDoc);
  const sortedPets = pets.sort((a, b) => a.time_created - b.time_created);

  return res.status(200).json({
    message: 'Pets retrieved successfully',
    pets: sortedPets,
  });
});

router.post('/buy-slot', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const currentSlots = getPetSlotLimit(user);
  if (currentSlots >= PET_SLOT_MAX) {
    return res.status(400).json({ error: 'You have reached the maximum pet slots (10)' });
  }

  if (!hasGems(user.gems, PET_SLOT_COST)) {
    return res.status(400).json({ error: 'Insufficient gems to buy a pet slot' });
  }

  if (user.gems !== -1) {
    user.gems = (user.gems || 0) - PET_SLOT_COST;
  }
  user.pet_slots = currentSlots + 1;
  await updateUser(user);

  return res.status(200).json({
    message: 'Pet slot purchased successfully',
    pet_slots: user.pet_slots,
    gems: user.gems,
  });
});

router.post('/adopt', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const maxPets = getPetSlotLimit(user);

  // Check if the user already has the maximum number of pets
  const pets = await getPetsByOwnerUUID(user_uuid);
  if (pets.length >= maxPets) {
    return res
      .status(400)
      .json({ error: `You have reached the maximum number of pets (${maxPets})` });
  }

  // Get a random pet type from the available pet types
  const i = Math.floor(Math.random() * petTypes.length);
  const petType = petTypes[i];

  const pet: IPet = {
    uuid: v4(),
    owner_uuid: user_uuid,
    name: null,
    type_id: petType.id,
    level: 1,
    time_last_fed: Date.now(),
    time_last_played: Date.now(),
    time_created: Date.now(),
    exp: 0,
    is_dead: false,
  };

  await createPet(pet);

  return res.status(200).json({
    message: 'Pet adopted successfully',
    pet: petToDoc(pet),
  });
});

router.post('/shop', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_type_id } = req.body as { pet_type_id?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_type_id) {
    return res.status(400).json({ error: 'Missing pet_type_id' });
  }

  const maxPets = getPetSlotLimit(user);

  // Check if the user already has the maximum number of pets
  const pets = await getPetsByOwnerUUID(user_uuid);
  if (pets.length >= maxPets) {
    return res
      .status(400)
      .json({ error: `You have reached the maximum number of pets (${maxPets})` });
  }

  const petType = petTypes.find(pt => pt.id === pet_type_id);
  if (!petType) {
    return res.status(400).json({ error: 'Invalid pet_type_id' });
  }

  // Check if the user has enough money to adopt the pet
  if ((user.money || 0) < petType.cost) {
    return res.status(400).json({ error: 'Insufficient funds to adopt this pet' });
  }

  // Deduct the money from the user
  user.money = (user.money || 0) - petType.cost;
  await updateUser(user);

  const pet: IPet = {
    uuid: v4(),
    owner_uuid: user_uuid,
    name: null,
    type_id: petType.id,
    level: 1,
    time_last_fed: Date.now(),
    time_last_played: Date.now(),
    time_created: Date.now(),
    exp: 0,
    is_dead: false,
  };

  await createPet(pet);

  return res.status(200).json({
    message: 'Pet purchased successfully',
    pet: petToDoc(pet),
  });
});

router.post('/name', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid, name } = req.body as { pet_uuid?: string; name?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid || !name) {
    return res.status(400).json({ error: 'Missing pet_uuid or name' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the pet already has a name
  if (pet.name) {
    return res.status(400).json({ error: 'Pet already has a name' });
  }

  // Check if the name is valid (only letters, numbers, spaces, underscores, and hyphens, max length 15)
  const nameRegex = /^[a-zA-Z0-9 _-]{1,15}$/;
  if (!nameRegex.test(name)) {
    return res.status(400).json({
      error:
        'Invalid name. Names can only contain letters, numbers, spaces, underscores, and hyphens, and must be between 1 and 15 characters long.',
    });
  }

  pet.name = name;
  pet.exp += 10; // Award 10 exp for naming the pet
  await updatePet(pet); // Using createPet to update the pet

  return res.status(200).json({
    message: 'Pet named successfully',
    pet: petToDoc(pet),
  });
});

router.post('/feed', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid, feed_type } = req.body as { pet_uuid?: string; feed_type?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid) {
    return res.status(400).json({ error: 'Missing pet_uuid' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the user has enough money to feed the pet
  const feedCost =
    feed_type && FEED_COSTS[feed_type] ? FEED_COSTS[feed_type] : FEED_COSTS['standard'];
  if ((user.money || 0) < feedCost) {
    return res.status(400).json({ error: 'Insufficient funds to feed the pet' });
  }

  // Check if the pet has been fed in the last 5 minutes
  if (!canFeedPet(pet)) {
    return res.status(400).json({ error: 'You can only feed your pet once every 5 minutes' });
  }

  // Check if the pet is asleep
  if (isPetAsleep(pet)) {
    return res.status(400).json({ error: 'Cannot feed the pet while it is asleep' });
  }

  // Deduct the money from the user
  user.money = (user.money || 0) - feedCost;
  await updateUser(user);

  // Update the pet's last fed time
  pet.time_last_fed = Date.now();

  // Add experience points to the pet for being fed
  pet.exp += feed_type && FEED_EXP[feed_type] ? FEED_EXP[feed_type] : FEED_EXP['standard'];

  await updatePet(pet);

  return res.status(200).json({
    message: 'Pet fed successfully',
    pet: petToDoc(pet),
  });
});

router.post('/play', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid } = req.body as { pet_uuid?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid) {
    return res.status(400).json({ error: 'Missing pet_uuid' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the user has played in the last 5 minutes
  if (!canPlayWithPet(pet)) {
    return res.status(400).json({ error: 'You can only play with your pet once every 5 minutes' });
  }

  // Check if the pet is asleep
  if (isPetAsleep(pet)) {
    return res.status(400).json({ error: 'Cannot play with the pet while it is asleep' });
  }

  // Update the pet's last played time
  pet.time_last_played = Date.now();

  // Add experience points to the pet for playing
  pet.exp += 5;

  await updatePet(pet);

  return res.status(200).json({
    message: 'Pet played with successfully',
    pet: petToDoc(pet),
  });
});

router.post('/release', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid } = req.body as { pet_uuid?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid) {
    return res.status(400).json({ error: 'Missing pet_uuid' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // If the pet is dead, it costs 500 to release
  if (pet.is_dead) {
    const releaseCost = 500;
    if ((user.money || 0) < releaseCost) {
      return res.status(400).json({ error: 'Insufficient funds to release the pet' });
    }
    user.money = (user.money || 0) - releaseCost;
    await updateUser(user);
  }

  // Remove the pet from the database
  await deletePetByUUID(pet.uuid);

  return res.status(200).json({
    message: 'Pet released successfully',
  });
});

router.post('/revive', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid } = req.body as { pet_uuid?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid) {
    return res.status(400).json({ error: 'Missing pet_uuid' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  if (!pet.is_dead) {
    return res.status(400).json({ error: 'Pet is not dead' });
  }

  // It costs 100,000 to revive a pet
  const reviveCost = 100000;
  if ((user.money || 0) < reviveCost) {
    return res.status(400).json({ error: 'Insufficient funds to revive the pet' });
  }
  user.money = (user.money || 0) - reviveCost;
  await updateUser(user);

  // Revive the pet
  pet.is_dead = false;
  pet.time_last_fed = Date.now();
  pet.time_last_played = Date.now();
  await updatePet(pet);

  return res.status(200).json({
    message: 'Pet revived successfully',
  });
});

router.post('/levelup', requireActive, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);
  const { pet_uuid } = req.body as { pet_uuid?: string };

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!pet_uuid) {
    return res.status(400).json({ error: 'Missing pet_uuid' });
  }

  const pet = await getPetByUUID(pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the pet can level up
  const canLevelUp = canLevelUpPet(pet);
  if (!canLevelUp) {
    return res.status(400).json({ error: 'Pet cannot level up yet' });
  }

  // Level up the pet
  pet.level += 1;
  await updatePet(pet);

  return res.status(200).json({
    message: 'Pet leveled up successfully',
    pet: petToDoc(pet),
  });
});

export default router;
