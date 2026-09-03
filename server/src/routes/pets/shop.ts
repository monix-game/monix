import { Elysia, t } from 'elysia';
import { createPet, getPetsByOwnerUUID, mutateUserAndSave } from '../../db';
import type { IPet } from '../../../common/models/pet';
import { petToDoc } from '../../../common/models/pet';
import { petTypes } from '../../../common/petTypes';
import { deriveAuth, onlyActive } from '../../middleware';
import { getPetSlotLimit } from './helpers';
import { v4 } from 'uuid';

type ShopOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; pet: ReturnType<typeof petToDoc> };

export const shopPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/shop',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { pet_type_id } = body;

      if (!pet_type_id) {
        set.status = 400;
        return { error: 'Missing pet_type_id' };
      }

      const petType = petTypes.find(pt => pt.id === pet_type_id);
      if (!petType) {
        set.status = 400;
        return { error: 'Invalid pet_type_id' };
      }

      const petTypeId = petType.id;
      const petCost = petType.cost;

      const result = await mutateUserAndSave<ShopOutcome>(
        user_uuid,
        async fetchedUser => {
          const maxPets = getPetSlotLimit(fetchedUser);

          // Check if the user already has the maximum number of pets
          const pets = await getPetsByOwnerUUID(user_uuid);
          if (pets.length >= maxPets) {
            return { changed: false, value: { ok: 'error', status: 400, error: `You have reached the maximum number of pets (${maxPets})` } };
          }

          // Check if the user has enough money to adopt the pet
          if ((fetchedUser.money || 0) < petCost) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds to adopt this pet' } };
          }

          // Deduct the money from the user
          fetchedUser.money = (fetchedUser.money || 0) - petCost;

          const pet: IPet = {
            uuid: v4(),
            owner_uuid: user_uuid,
            name: null,
            type_id: petTypeId,
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
            value: { ok: 'success' as const, message: 'Pet purchased successfully', pet: petToDoc(pet) },
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
    },
    {
      body: t.Object({ pet_type_id: t.Optional(t.String()) }),
    }
  );

export default shopPet;
