import { Elysia } from 'elysia';
import { createPet, getPetsByOwnerUUID, mutateUserAndSave } from '../../db';
import type { IPet } from '../../../common/models/pet';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { petToDoc } from '../../../common/models/pet';
import { petTypes } from '../../../common/petTypes';
import { deriveAuth, onlyActive } from '../../middleware';
import { getPetSlotLimit } from './helpers';
import { v4 } from 'uuid';

type AdoptOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; pet: ReturnType<typeof petToDoc> };

export const adoptPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/adopt', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;

    const result = await mutateUserAndSave<AdoptOutcome>(
      user_uuid,
      async fetchedUser => {
        const maxPets = getPetSlotLimit(fetchedUser);

        // Check if the user already has the maximum number of pets
        const pets = await getPetsByOwnerUUID(user_uuid);
        if (pets.length >= maxPets) {
          return { changed: false, value: { ok: 'error', status: 400, error: `You have reached the maximum number of pets (${maxPets})` } };
        }

        // Check if the user has enough money to adopt a pet
        if ((fetchedUser.money || 0) < 10000) {
          return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds to adopt a pet' } };
        }

        // Deduct the money from the user
        fetchedUser.money = (fetchedUser.money || 0) - 10000;
        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.pets_adopted = (fetchedUser.stats.pets_adopted || 0) + 1;

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

        return {
          changed: true,
          value: { ok: 'success' as const, message: 'Pet adopted successfully', pet: petToDoc(pet) },
        };
      }
    );

    if (!result) {
      set.status = 404;
      return { error: 'User not found' };
    }
    if (result.ok === 'error') {
      set.status = result.status;
      return { error: result.error };
    }
    return result;
  });

export default adoptPet;
