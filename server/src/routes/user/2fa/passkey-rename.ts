import { Elysia, t } from 'elysia';
import { getUserByUUID, updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';

export const passkeyRename = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/passkey/rename',
    async ({ body, authUser, set }) => {
      const { id, name } = body;
      if (!id || !name) {
        set.status = 400;
        return { error: 'Missing passkey id or name' };
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

      const passkey = (user.passkeys || []).find(pk => pk.id === id);
      if (!passkey) {
        set.status = 404;
        return { error: 'Passkey not found' };
      }

      passkey.name = String(name).slice(0, 50);
      await updateUser(user);

      return { message: 'Passkey renamed successfully' };
    },
    {
      body: t.Object({
        id: t.Optional(t.String()),
        name: t.Optional(t.String()),
      }),
    }
  );

export default passkeyRename;
