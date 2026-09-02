import { Elysia } from 'elysia';
import { createPet, getPetsByOwnerUUID, getUserByUUID, updateUser } from '../../db';
import type { IPet } from '../../../common/models/pet';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { petToDoc } from '../../../common/models/pet';
import { petTypes } from '../../../common/petTypes';
import { deriveAuth, onlyActive } from '../../middleware';
import { getPetSlotLimit } from './helpers';
import { v4 } from 'uuid';

export const adoptPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/adopt', async ({ authUser, set }) => {
    const user = authUser;
    const user_uuid: string | undefined = user?.uuid;
    const fetchedUser = await getUserByUUID(user_uuid as string);

    if (!fetchedUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const maxPets = getPetSlotLimit(fetchedUser);

    // Check if the user already has the maximum number of pets
    const pets = await getPetsByOwnerUUID(user_uuid as string);
    if (pets.length >= maxPets) {
      set.status = 400;
      return { error: `You have reached the maximum number of pets (${maxPets})` };
    }

    // Check if the user has enough money to adopt a pet
    if ((fetchedUser.money || 0) < 10000) {
      set.status = 400;
      return { error: 'Insufficient funds to adopt a pet' };
    }

    // Deduct the money from the user
    fetchedUser.money = (fetchedUser.money || 0) - 10000;
    fetchedUser.stats ??= DEFAULT_USER_STATS;
    fetchedUser.stats.pets_adopted = (fetchedUser.stats.pets_adopted || 0) + 1;
    await updateUser(fetchedUser);

    // Get a random pet type from the available pet types
    const i = Math.floor(Math.random() * petTypes.length);
    const petType = petTypes[i];

    const pet: IPet = {
      uuid: v4(),
      owner_uuid: user_uuid as string,
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

    return {
      message: 'Pet adopted successfully',
      pet: petToDoc(pet),
    };
  });

export default adoptPet;
