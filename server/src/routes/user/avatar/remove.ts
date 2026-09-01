import { Elysia } from 'elysia';
import { updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';

export const removeAvatar = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/remove/avatar', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    user.avatar_data_uri = undefined;
    await updateUser(user);

    return { message: 'Avatar removed successfully' };
  });

export default removeAvatar;
