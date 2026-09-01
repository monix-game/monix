import { Elysia, t } from 'elysia';
import { getPetByUUID, getUserByUUID, updatePet, updateUser } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { deriveAuth, onlyActive } from '../../middleware';
import { canFeedPet, isPetAsleep } from '../../../common/pet';
import { FEED_COSTS, FEED_EXP } from './helpers';

export const feedPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/feed',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);
      const { pet_uuid, feed_type } = body;

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

      // Check if the user has enough money to feed the pet
      const feedCost =
        feed_type && FEED_COSTS[feed_type] ? FEED_COSTS[feed_type] : FEED_COSTS['standard'];
      if ((fetchedUser.money || 0) < feedCost) {
        set.status = 400;
        return { error: 'Insufficient funds to feed the pet' };
      }

      // Check if the pet has been fed in the last 5 minutes
      if (!canFeedPet(pet)) {
        set.status = 400;
        return { error: 'You can only feed your pet once every 5 minutes' };
      }

      // Check if the pet is asleep
      if (isPetAsleep(pet)) {
        set.status = 400;
        return { error: 'Cannot feed the pet while it is asleep' };
      }

      // Deduct the money from the user
      fetchedUser.money = (fetchedUser.money || 0) - feedCost;
      await updateUser(fetchedUser);

      // Update the pet's last fed time
      pet.time_last_fed = Date.now();

      // Add experience points to the pet for being fed
      pet.exp += feed_type && FEED_EXP[feed_type] ? FEED_EXP[feed_type] : FEED_EXP['standard'];

      await updatePet(pet);

      return {
        message: 'Pet fed successfully',
        pet: petToDoc(pet),
      };
    },
    {
      body: t.Object({
        pet_uuid: t.Optional(t.String()),
        feed_type: t.Optional(t.String()),
      }),
    }
  );

export default feedPet;
