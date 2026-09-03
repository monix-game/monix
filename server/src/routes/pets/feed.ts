import { Elysia, t } from 'elysia';
import { getPetByUUID, mutateUserAndSave, updatePet } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { deriveAuth, onlyActive } from '../../middleware';
import { canFeedPet, isPetAsleep } from '../../../common/pet';
import { FEED_COSTS, FEED_EXP } from './helpers';

type FeedOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; pet: ReturnType<typeof petToDoc> };

export const feedPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/feed',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { pet_uuid, feed_type } = body;

      if (!pet_uuid) {
        set.status = 400;
        return { error: 'Missing pet_uuid' };
      }

      const pet = await getPetByUUID(pet_uuid);
      if (!pet) {
        set.status = 404;
        return { error: 'Pet not found' };
      }

      // Check if the pet has been fed in the last 5 minutes / is asleep first
      // (pet state, not user state, so it's safe to check outside the lock).
      if (!canFeedPet(pet)) {
        set.status = 400;
        return { error: 'You can only feed your pet once every 5 minutes' };
      }
      if (isPetAsleep(pet)) {
        set.status = 400;
        return { error: 'Cannot feed the pet while it is asleep' };
      }

      const feedCost =
        feed_type && FEED_COSTS[feed_type] ? FEED_COSTS[feed_type] : FEED_COSTS['standard'];

      const result = await mutateUserAndSave<FeedOutcome>(user_uuid, async fetchedUser => {
        if ((fetchedUser.money || 0) < feedCost) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient funds to feed the pet' },
          };
        }

        fetchedUser.money = (fetchedUser.money || 0) - feedCost;
        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.pets_fed = (fetchedUser.stats.pets_fed || 0) + 1;

        return { changed: true, value: { ok: 'success' as const, pet: petToDoc(pet) } };
      });

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }

      // Update the pet's last fed time and add experience
      pet.time_last_fed = Date.now();
      pet.exp += feed_type && FEED_EXP[feed_type] ? FEED_EXP[feed_type] : FEED_EXP['standard'];
      pet.bond = Math.min(100, (pet.bond || 0) + 2);
      await updatePet(pet);

      return result;
    },
    {
      body: t.Object({
        pet_uuid: t.Optional(t.String()),
        feed_type: t.Optional(t.String()),
      }),
    }
  );

export default feedPet;
