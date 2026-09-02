import { Elysia, t } from 'elysia';
import { getPetByUUID, getUserByUUID, updatePet, updateUser } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { deriveAuth, onlyActive } from '../../middleware';
import { canPlayWithPet, isPetAsleep } from '../../../common/pet';

export const playPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/play',
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

      // Check if the user has played in the last 5 minutes
      if (!canPlayWithPet(pet)) {
        set.status = 400;
        return { error: 'You can only play with your pet once every 5 minutes' };
      }

      // Check if the pet is asleep
      if (isPetAsleep(pet)) {
        set.status = 400;
        return { error: 'Cannot play with the pet while it is asleep' };
      }

      // Update the pet's last played time
      pet.time_last_played = Date.now();

      // Add experience points to the pet for playing
      pet.exp += 5;

      fetchedUser.stats ??= DEFAULT_USER_STATS;
      fetchedUser.stats.pets_played = (fetchedUser.stats.pets_played || 0) + 1;
      await updateUser(fetchedUser);

      await updatePet(pet);

      return {
        message: 'Pet played with successfully',
        pet: petToDoc(pet),
      };
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default playPet;
