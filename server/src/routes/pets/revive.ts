import { Elysia, t } from 'elysia';
import { getPetByUUID, getUserByUUID, updatePet, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const revivePet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/revive',
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

      if (!pet.is_dead) {
        set.status = 400;
        return { error: 'Pet is not dead' };
      }

      // It costs 100,000 to revive a pet
      const reviveCost = 100000;
      if ((fetchedUser.money || 0) < reviveCost) {
        set.status = 400;
        return { error: 'Insufficient funds to revive the pet' };
      }
      fetchedUser.money = (fetchedUser.money || 0) - reviveCost;
      await updateUser(fetchedUser);

      // Revive the pet
      pet.is_dead = false;
      pet.time_last_fed = Date.now();
      pet.time_last_played = Date.now();
      await updatePet(pet);

      return {
        message: 'Pet revived successfully',
      };
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default revivePet;
