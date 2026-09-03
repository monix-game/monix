import { Elysia, t } from 'elysia';
import { getPetByUUID, mutateUserAndSave, updatePet } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { deriveAuth, onlyActive } from '../../middleware';
import { canPlayWithPet, isPetAsleep } from '../../../common/pet';

type PlayOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; pet: ReturnType<typeof petToDoc> };

export const playPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/play',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { pet_uuid } = body;

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
      if (isPetAsleep(pet)) {
        set.status = 400;
        return { error: 'Cannot play with the pet while it is asleep' };
      }

      const result = await mutateUserAndSave<PlayOutcome>(user_uuid, async fetchedUser => {
        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.pets_played = (fetchedUser.stats.pets_played || 0) + 1;
        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'Pet played with successfully',
            pet: petToDoc(pet),
          },
        };
      });

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }

      // Update the pet's last played time and add experience
      pet.time_last_played = Date.now();
      pet.exp += 5;
      pet.bond = Math.min(100, (pet.bond || 0) + 3);
      await updatePet(pet);

      return result;
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default playPet;
