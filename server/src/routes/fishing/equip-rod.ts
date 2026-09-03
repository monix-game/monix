import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingRods } from '../../../common/fishing/fishingRods';

type EquipRodOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; equipped_rod: string | undefined };

export const equipRod = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/equip/rod',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { rod_id } = body as { rod_id: string };

      if (!rod_id || typeof rod_id !== 'string') {
        set.status = 400;
        return { error: 'rod_id is required and must be a string' };
      }

      const rod = fishingRods.find(r => r.id === rod_id);
      if (!rod) {
        set.status = 400;
        return { error: 'Invalid rod_id' };
      }

      const result = await mutateUserAndSave<EquipRodOutcome>(
        user_uuid,
        async fetchedUser => {
          if (!fetchedUser.fishing?.rods_owned?.includes(rod_id)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'You do not own this rod' } };
          }

          // Equip the rod
          fetchedUser.fishing.equipped_rod = rod_id;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Rod equipped successfully',
              equipped_rod: fetchedUser.fishing.equipped_rod,
            },
          };
        }
      );

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }
      return result;
    },
    {
      body: t.Object({ rod_id: t.Optional(t.String()) }),
    }
  );

export default equipRod;
