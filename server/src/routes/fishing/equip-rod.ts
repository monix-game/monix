import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

export const equipRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/equip/rod',
    async ({ body, authUser, set }) => {
      const user = authUser;
      const user_uuid: string | undefined = user?.uuid;
      const fetchedUser = await getUserByUUID(user_uuid as string);

      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { rod_id } = body as { rod_id: string };

      if (!rod_id) {
        set.status = 400;
        return { error: 'rod_id is required' };
      }

      if (typeof rod_id !== 'string') {
        set.status = 400;
        return { error: 'rod_id must be a string' };
      }

      const rod = fishingRods.find(r => r.id === rod_id);

      if (!rod) {
        set.status = 400;
        return { error: 'Invalid rod_id' };
      }

      if (!fetchedUser.fishing?.rods_owned?.includes(rod_id)) {
        set.status = 400;
        return { error: 'You do not own this rod' };
      }

      // Equip the rod
      fetchedUser.fishing.equipped_rod = rod_id;

      await updateUser(fetchedUser);

      return {
        message: 'Rod equipped successfully',
        equipped_rod: fetchedUser.fishing.equipped_rod,
      };
    },
    {
      body: t.Object({ rod_id: t.Optional(t.String()) }),
    }
  );

export default equipRod;
