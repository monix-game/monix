import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';

type UnequipCosmeticOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const unequipCosmetic = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/cosmetics/unequip',
    async ({ body, authUser, set }) => {
      const { cosmetic_type } = body;
      if (!cosmetic_type) {
        set.status = 400;
        return { error: 'Missing cosmetic type' };
      }

      const authUser2 = authUser;
      if (!authUser2) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const result = await mutateUserAndSave<UnequipCosmeticOutcome>(
        authUser2.uuid,
        async user => {
          user.equipped_cosmetics ??= {};

          if (cosmetic_type === 'nameplate') {
            user.equipped_cosmetics.nameplate = undefined;
          } else if (cosmetic_type === 'tag') {
            user.equipped_cosmetics.tag = undefined;
          } else {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Invalid cosmetic type' } };
          }

          return { changed: true, value: { ok: 'success' as const, message: 'Cosmetic unequipped successfully' } };
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
      body: t.Object({ cosmetic_type: t.Optional(t.String()) }),
    }
  );

export default unequipCosmetic;
