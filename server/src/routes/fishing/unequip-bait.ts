import { Elysia } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

type UnequipBaitOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; equipped_bait: undefined };

export const unequipBait = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/unequip/bait',
    async ({ authUser, set }) => {
      const user_uuid = authUser?.uuid as string;

      const result = await mutateUserAndSave<UnequipBaitOutcome>(
        user_uuid,
        async fetchedUser => {
          const fishingState = fetchedUser.fishing;
          if (!fishingState) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'No fishing state available' } };
          }

          fishingState.equipped_bait = undefined;

          return {
            changed: true,
            value: {
              ok: 'success' as const,
              message: 'Bait unequipped successfully',
              equipped_bait: undefined,
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
    }
  );

export default unequipBait;
