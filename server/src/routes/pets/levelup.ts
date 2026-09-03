import { Elysia, t } from 'elysia';
import { getPetByUUID, getUserByUUID, updatePet } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { deriveAuth, onlyActive } from '../../middleware';
import { canLevelUpPet } from '../../../common/pet';

export const levelUpPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/levelup',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);
      const { pet_uuid } = body;

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (!pet_uuid) {
        set.status = 400;
        return { error: 'Missing pet_uuid' };
      }

      const pet = await getPetByUUID(pet_uuid);

      if (!pet) {
        set.status = 404;
        return { error: 'Pet not found' };
      }

      // Check if the pet can level up
      const canLevelUp = canLevelUpPet(pet);
      if (!canLevelUp) {
        set.status = 400;
        return { error: 'Pet cannot level up yet' };
      }

      // Level up the pet
      pet.level += 1;
      if (pet.level >= 50) pet.rarity = 'legendary';
      else if (pet.level >= 25) pet.rarity = 'epic';
      else if (pet.level >= 10) pet.rarity = 'rare';
      await updatePet(pet);

      return {
        message: 'Pet leveled up successfully',
        pet: petToDoc(pet),
      };
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default levelUpPet;
