import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { fishingBaits } from '../../../common/fishing/fishingBait';

type EquipBaitOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; equipped_bait: string };

export const equipBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/equip/bait',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { bait_id } = body as { bait_id: string };

      if (!bait_id || typeof bait_id !== 'string') {
        set.status = 400;
        return { error: 'bait_id is required and must be a string' };
      }

      if (!fishingBaits.some(b => b.id === bait_id)) {
        set.status = 400;
        return { error: 'Invalid bait_id' };
      }

      const result = await mutateUserAndSave<EquipBaitOutcome>(
        user_uuid,
        async fetchedUser => {
          if (
            !fetchedUser.fishing?.bait_owned?.[bait_id] ||
            fetchedUser.fishing.bait_owned[bait_id] <= 0
          ) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'You do not own this bait' } };
          }

          // Equip the bait
          fetchedUser.fishing.equipped_bait = bait_id;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Bait equipped successfully',
              equipped_bait: fetchedUser.fishing.equipped_bait,
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
      body: t.Object({ bait_id: t.Optional(t.String()) }),
    }
  );

export default equipBait;
