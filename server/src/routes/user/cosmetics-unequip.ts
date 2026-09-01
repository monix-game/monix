import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

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

      const user = await getUserByUUID(authUser2.uuid);
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      user.equipped_cosmetics ??= {};

      if (cosmetic_type === 'nameplate') {
        user.equipped_cosmetics.nameplate = undefined;
      } else if (cosmetic_type === 'tag') {
        user.equipped_cosmetics.tag = undefined;
      } else if (cosmetic_type === 'frame') {
        user.equipped_cosmetics.frame = undefined;
      } else {
        set.status = 400;
        return { error: 'Invalid cosmetic type' };
      }

      await updateUser(user);

      return { message: 'Cosmetic unequipped successfully' };
    },
    {
      body: t.Object({ cosmetic_type: t.Optional(t.String()) }),
    }
  );

export default unequipCosmetic;
