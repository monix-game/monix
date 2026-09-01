import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { cosmetics } from '../../../common/cosmetics/cosmetics';

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

      const user = await getUserByUUID(authUser2.uuid);
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      if (!user.cosmetics_unlocked?.includes(cosmetic_id)) {
        set.status = 400;
        return { error: 'Cosmetic not unlocked' };
      }

      const cosmetic = cosmetics.find(c => c.id === cosmetic_id);
      if (!cosmetic) {
        set.status = 404;
        return { error: 'Cosmetic not found' };
      }

      user.equipped_cosmetics ??= {};

      if (cosmetic.type === 'nameplate') {
        user.equipped_cosmetics.nameplate = cosmetic.id;
      } else if (cosmetic.type === 'tag') {
        user.equipped_cosmetics.tag = cosmetic.id;
      } else if (cosmetic.type === 'frame') {
        user.equipped_cosmetics.frame = cosmetic.id;
      } else {
        set.status = 400;
        return { error: 'Invalid cosmetic type' };
      }

      await updateUser(user);

      return { message: 'Cosmetic equipped successfully' };
    },
    {
      body: t.Object({ cosmetic_id: t.Optional(t.String()) }),
    }
  );

export default equipCosmetic;
