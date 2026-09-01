import { Elysia, t } from 'elysia';
import { updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { verifyTOTPToken } from '../../helpers/totp';

export const remove2fa = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/remove-2fa',
    async ({ body, authUser, set }) => {
      const { token } = body;
      if (!token) {
        set.status = 400;
        return { error: 'Missing 2FA token' };
      }

      const user = authUser;
      if (!user) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (!user.totp_secret || !user.setup_totp) {
        set.status = 400;
        return { error: '2FA not set up' };
      }

      const isTokenValid = verifyTOTPToken(user.totp_secret, token);
      if (!isTokenValid) {
        set.status = 401;
        return { error: 'Invalid 2FA token' };
      }

      user.totp_secret = undefined;
      user.setup_totp = false;
      await updateUser(user);

      return { message: '2FA removed successfully' };
    },
    {
      body: t.Object({ token: t.Optional(t.String()) }),
    }
  );

export default remove2fa;
