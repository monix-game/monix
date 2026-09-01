import { Elysia } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

export const unequipBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/unequip/bait',
    async ({ authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const fishingState = fetchedUser.fishing;
      if (!fishingState) {
        set.status = 400;
        return { error: 'No fishing state available' };
      }

      fishingState.equipped_bait = undefined;

      await updateUser(fetchedUser);

      return {
        message: 'Bait unequipped successfully',
        equipped_bait: fishingState.equipped_bait,
      };
    }
  );

export default unequipBait;
