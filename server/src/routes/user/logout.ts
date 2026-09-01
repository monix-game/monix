import { Elysia } from 'elysia';
import { deleteSessionsByUserUUID } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const logout = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/logout', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    await deleteSessionsByUserUUID(user.uuid);

    return { message: 'All sessions logged out successfully' };
  });

export default logout;
