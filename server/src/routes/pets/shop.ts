import { Elysia, t } from 'elysia';
import { createPet, getPetsByOwnerUUID, getUserByUUID, updateUser } from '../../db';
import type { IPet } from '../../../common/models/pet';
import { petToDoc } from '../../../common/models/pet';
import { petTypes } from '../../../common/petTypes';
import { deriveAuth, onlyActive } from '../../middleware';
import { getPetSlotLimit } from './helpers';
import { v4 } from 'uuid';

export const shopPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/shop',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);
      const { pet_type_id } = body;

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (!pet_type_id) {
        set.status = 400;
        return { error: 'Missing pet_type_id' };
      }

      const maxPets = getPetSlotLimit(fetchedUser);

      // Check if the user already has the maximum number of pets
      const pets = await getPetsByOwnerUUID(user_uuid as string);
      if (pets.length >= maxPets) {
        set.status = 400;
        return { error: `You have reached the maximum number of pets (${maxPets})` };
      }

      const petType = petTypes.find(pt => pt.id === pet_type_id);
      if (!petType) {
        set.status = 400;
        return { error: 'Invalid pet_type_id' };
      }

      // Check if the user has enough money to adopt the pet
      if ((fetchedUser.money || 0) < petType.cost) {
        set.status = 400;
        return { error: 'Insufficient funds to adopt this pet' };
      }

      // Deduct the money from the user
      fetchedUser.money = (fetchedUser.money || 0) - petType.cost;
      await updateUser(fetchedUser);

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
        message: 'Pet purchased successfully',
        pet: petToDoc(pet),
      };
    },
    {
      body: t.Object({ pet_type_id: t.Optional(t.String()) }),
    }
  );

export default shopPet;
