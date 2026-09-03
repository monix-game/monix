import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';
import { cosmetics } from '../../../../common/cosmetics/cosmetics';

type EquipCosmeticOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const equipCosmetic = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/cosmetics/equip',
    async ({ body, authUser, set }) => {
      const { cosmetic_id } = body;
      if (!cosmetic_id) {
        set.status = 400;
        return { error: 'Missing cosmetic ID' };
      }

      const authUser2 = authUser;
      if (!authUser2) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const cosmetic = cosmetics.find(c => c.id === cosmetic_id);
      if (!cosmetic) {
        set.status = 404;
        return { error: 'Cosmetic not found' };
      }

      const result = await mutateUserAndSave<EquipCosmeticOutcome>(
        authUser2.uuid,
        async user => {
          if (!user.cosmetics_unlocked?.includes(cosmetic_id)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Cosmetic not unlocked' } };
          }

          user.equipped_cosmetics ??= {};

          if (cosmetic.type === 'nameplate') {
            user.equipped_cosmetics.nameplate = cosmetic.id;
          } else if (cosmetic.type === 'tag') {
            user.equipped_cosmetics.tag = cosmetic.id;
          } else {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Invalid cosmetic type' } };
          }

          return { changed: true, value: { ok: 'success' as const, message: 'Cosmetic equipped successfully' } };
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
      body: t.Object({ cosmetic_id: t.Optional(t.String()) }),
    }
  );

export default equipCosmetic;
