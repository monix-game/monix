import { Elysia, t } from 'elysia';
import { updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import crypto from 'node:crypto';

export const changePassword = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/change/password',
    async ({ body, authUser, set }) => {
      const { old_password, new_password } = body;
      if (!old_password || !new_password) {
        set.status = 400;
        return { error: 'Missing old or new password' };
      }

      if (old_password === new_password) {
        set.status = 400;
        return { error: 'New password must be different from old password' };
      }

      if (typeof new_password !== 'string') {
        set.status = 400;
        return { error: 'New password must be a string' };
      }

      const user = authUser;
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const old_password_hash = crypto
        .createHash('sha256')
        .update(String(old_password))
        .digest('hex');
      if (user.password_hash !== old_password_hash) {
        set.status = 401;
        return { error: 'Old password is incorrect' };
      }

      if (new_password.length < 6) {
        set.status = 400;
        return { error: 'New password must be at least 6 characters long' };
      }

      const new_password_hash = crypto
        .createHash('sha256')
        .update(String(new_password))
        .digest('hex');
      user.password_hash = new_password_hash;
      await updateUser(user);

      return { message: 'Password changed successfully' };
    },
    {
      body: t.Object({
        old_password: t.Optional(t.String()),
        new_password: t.Optional(t.String()),
      }),
    }
  );

export default changePassword;
