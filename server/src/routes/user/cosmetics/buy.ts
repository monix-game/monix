import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';
import { cosmetics } from '../../../../common/cosmetics/cosmetics';
import { hasGems } from '../../../../common/math';

export const buyCosmetic = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
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

      const user = await getUserByUUID(authUser2.uuid);
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const cosmetic = cosmetics.find(c => c.id === cosmetic_id && c.buyable);
      if (!cosmetic) {
        set.status = 404;
        return { error: 'Cosmetic not found or not buyable' };
      }

      if (user.cosmetics_unlocked?.includes(cosmetic_id)) {
        set.status = 400;
        return { error: 'Cosmetic already unlocked' };
      }

      if (!cosmetic.price) {
        set.status = 400;
        return { error: 'Cosmetic has no price' };
      }

      if (!hasGems(user.gems, cosmetic.price)) {
        set.status = 400;
        return { error: 'Insufficient gems' };
      }

      if (user.gems !== -1) {
        user.gems -= cosmetic.price;
      }

      user.cosmetics_unlocked = user.cosmetics_unlocked || [];
      user.cosmetics_unlocked.push(cosmetic_id);

      await updateUser(user);

      return { message: 'Cosmetic purchased successfully' };
    },
    {
      body: t.Object({ cosmetic_id: t.Optional(t.String()) }),
    }
  );

export default buyCosmetic;
