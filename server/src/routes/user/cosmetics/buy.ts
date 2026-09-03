import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../../db';
import { deriveAuth, onlyAuth, onlyFeatureEnabled } from '../../../middleware';
import { cosmetics } from '../../../../common/cosmetics/cosmetics';
import { hasGems } from '../../../../common/math';

type BuyCosmeticOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const buyCosmetic = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .onBeforeHandle(onlyFeatureEnabled('cosmeticPurchases'))
  .post(
    '/cosmetics/buy',
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

      const cosmetic = cosmetics.find(c => c.id === cosmetic_id && c.buyable);
      if (!cosmetic) {
        set.status = 404;
        return { error: 'Cosmetic not found or not buyable' };
      }
      if (!cosmetic.price) {
        set.status = 400;
        return { error: 'Cosmetic has no price' };
      }

      const cosmeticPrice = cosmetic.price;

      const result = await mutateUserAndSave<BuyCosmeticOutcome>(
        authUser2.uuid,
        async user => {
          if (user.cosmetics_unlocked?.includes(cosmetic_id)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Cosmetic already unlocked' } };
          }
          if (!hasGems(user.gems, cosmeticPrice)) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient gems' } };
          }

          if (user.gems !== -1) {
            user.gems -= cosmeticPrice;
          }
          user.cosmetics_unlocked = user.cosmetics_unlocked || [];
          user.cosmetics_unlocked.push(cosmetic_id);

          return { changed: true, value: { ok: 'success' as const, message: 'Cosmetic purchased successfully' } };
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

export default buyCosmetic;
