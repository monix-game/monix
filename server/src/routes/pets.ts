import { Router } from 'express';
import { requireAuth } from '../middleware';
import {
  createPet,
  deletePetByUUID,
  getPetsByOwnerUUID,
  getUserByUUID,
  updatePet,
  updateUser,
} from '../db';
import { type IUser } from '../../common/models/user';
import { type IPet, petToDoc } from '../../common/models/pet';
import { petTypes } from '../../common/petTypes';
import { v4 } from 'uuid';
import { canFeedPet, canLevelUpPet, canPlayWithPet } from '../../common/pet';

const router = Router();

router.get('/all', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const pets = (await getPetsByOwnerUUID(user_uuid)).map(petToDoc);

  return res.status(200).json({
    message: 'Pets retrieved successfully',
    pets: pets.sort((a, b) => a.time_created - b.time_created),
  });
});

router.post('/adopt', requireAuth, async (req, res) => {
  // @ts-expect-error Because we add authUser in the middleware
  const authUser = req.authUser as IUser;
  const user_uuid: string = authUser?.uuid;
  const user = await getUserByUUID(user_uuid);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if the user already has the maximum number of pets (3)
  const pets = await getPetsByOwnerUUID(user_uuid);
  if (pets.length >= 3) {
    return res.status(400).json({ error: 'You have reached the maximum number of pets (3)' });
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
  };

  await createPet(pet);

  return res.status(200).json({
    message: 'Pet adopted successfully',
    pet: petToDoc(pet),
  });
});

router.post('/name', requireAuth, async (req, res) => {
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

  const pets = await getPetsByOwnerUUID(user_uuid);
  const pet = pets.find(p => p.uuid === pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the pet already has a name
  if (pet.name) {
    return res.status(400).json({ error: 'Pet already has a name' });
  }

  // Check if the name is valid (only letters, numbers, spaces, underscores, and hyphens, max length 20)
  const nameRegex = /^[a-zA-Z0-9 _-]{1,20}$/;
  if (!nameRegex.test(name)) {
    return res.status(400).json({
      error:
        'Invalid name. Names can only contain letters, numbers, spaces, underscores, and hyphens, and must be between 1 and 20 characters long.',
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

router.post('/feed', requireAuth, async (req, res) => {
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

  const pets = await getPetsByOwnerUUID(user_uuid);
  const pet = pets.find(p => p.uuid === pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the user has enough money to feed the pet
  const feedCost = 50;
  if ((user.money || 0) < feedCost) {
    return res.status(400).json({ error: 'Not enough money to feed the pet' });
  }

  // Check if the pet has been fed in the last 5 minutes
  if (!canFeedPet(pet)) {
    return res.status(400).json({ error: 'You can only feed your pet once every 5 minutes' });
  }

  // Deduct the money from the user
  user.money = (user.money || 0) - feedCost;
  await updateUser(user);

  // Update the pet's last fed time
  pet.time_last_fed = Date.now();

  // Add experience points to the pet for being fed
  pet.exp += 15;

  await updatePet(pet);

  return res.status(200).json({
    message: 'Pet fed successfully',
    pet: petToDoc(pet),
  });
});

router.post('/play', requireAuth, async (req, res) => {
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

  const pets = await getPetsByOwnerUUID(user_uuid);
  const pet = pets.find(p => p.uuid === pet_uuid);

  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Check if the user has played in the last 5 minutes
  if (!canPlayWithPet(pet)) {
    return res.status(400).json({ error: 'You can only play with your pet once every 5 minutes' });
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

router.post('/release', requireAuth, async (req, res) => {
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

  const pets = await getPetsByOwnerUUID(user_uuid);
  const petIndex = pets.findIndex(p => p.uuid === pet_uuid);

  if (petIndex === -1) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  // Remove the pet from the database
  await deletePetByUUID(pet_uuid);

  return res.status(200).json({
    message: 'Pet released successfully',
  });
});

router.post('/levelup', requireAuth, async (req, res) => {
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

  const pets = await getPetsByOwnerUUID(user_uuid);
  const pet = pets.find(p => p.uuid === pet_uuid);

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
