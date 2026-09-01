import { Elysia, t } from 'elysia';
import { updateUser } from '../../../db';
import { deriveAuth, onlyAuth } from '../../../middleware';
import { verifyTOTPToken } from '../../../helpers/totp';
import { ensureRecoveryCodes } from '../../../helpers/2fa';

export const finish2fa = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/finish-2fa',
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
      if (!user.totp_secret) {
        set.status = 400;
        return { error: '2FA not set up' };
      }
      if (user.setup_totp) {
        set.status = 400;
        return { error: '2FA already set up' };
      }

      const isTokenValid = verifyTOTPToken(user.totp_secret, token);
      if (!isTokenValid) {
        set.status = 401;
        return { error: 'Invalid 2FA token' };
      }

      user.setup_totp = true;

      // First time enabling any 2FA: seed recovery codes.
      const recovery = ensureRecoveryCodes(user);

      await updateUser(user);

      if (recovery.created) {
        return {
          message: '2FA setup completed successfully',
          recoveryCodes: recovery.plain,
        };
      }

      return { message: '2FA setup completed successfully' };
    },
    {
      body: t.Object({ token: t.Optional(t.String()) }),
    }
  );

export default finish2fa;
