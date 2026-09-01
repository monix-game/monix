import { Elysia, t } from 'elysia';
import { deletePetByUUID, getPetByUUID, getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const releasePet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/release',
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

      // If the pet is dead, it costs 500 to release
      if (pet.is_dead) {
        const releaseCost = 500;
        if ((fetchedUser.money || 0) < releaseCost) {
          set.status = 400;
          return { error: 'Insufficient funds to release the pet' };
        }
        fetchedUser.money = (fetchedUser.money || 0) - releaseCost;
        await updateUser(fetchedUser);
      }

      // Remove the pet from the database
      await deletePetByUUID(pet.uuid);

      return {
        message: 'Pet released successfully',
      };
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default releasePet;
