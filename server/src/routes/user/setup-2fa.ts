import { Elysia } from 'elysia';
import { updateUser } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';
import { createSecret, getTOTPURI } from '../../helpers/totp';

export const setup2fa = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post('/setup-2fa', async ({ authUser, set }) => {
    const user = authUser;

    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }

    const secret = createSecret();

    user.totp_secret = secret;
    await updateUser(user);

    const uri = getTOTPURI(secret, user.username);

    return { message: 'Setup 2FA successfully', uri };
  });

export default setup2fa;
