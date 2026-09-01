import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';

export const passkeyDelete = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/passkey/delete',
    async ({ body, authUser, set }) => {
      const { id } = body;
      if (!id) {
        set.status = 400;
        return { error: 'Missing passkey id' };
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

      const before = (user.passkeys || []).length;
      user.passkeys = (user.passkeys || []).filter(pk => pk.id !== id);

      if (user.passkeys.length === before) {
        set.status = 404;
        return { error: 'Passkey not found' };
      }

      await updateUser(user);

      return { message: 'Passkey removed successfully' };
    },
    {
      body: t.Object({ id: t.Optional(t.String()) }),
    }
  );

export default passkeyDelete;
