import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingBaits } from '../../../common/fishing/fishingBait';

export const equipBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/equip/bait',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { bait_id } = body as { bait_id: string };

      if (!bait_id) {
        set.status = 400;
        return { error: 'bait_id is required' };
      }

      if (typeof bait_id !== 'string') {
        set.status = 400;
        return { error: 'bait_id must be a string' };
      }

      const bait = fishingBaits.some(b => b.id === bait_id);

      if (!bait) {
        set.status = 400;
        return { error: 'Invalid bait_id' };
      }

      if (!fetchedUser.fishing?.bait_owned?.[bait_id] || fetchedUser.fishing.bait_owned[bait_id] <= 0) {
        set.status = 400;
        return { error: 'You do not own this bait' };
      }

      // Equip the bait
      fetchedUser.fishing.equipped_bait = bait_id;

      await updateUser(fetchedUser);

      return {
        message: 'Bait equipped successfully',
        equipped_bait: fetchedUser.fishing.equipped_bait,
      };
    },
    {
      body: t.Object({ bait_id: t.Optional(t.String()) }),
    }
  );

export default equipBait;
