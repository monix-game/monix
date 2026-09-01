import { Elysia, t } from 'elysia';
import { getUserByUsername } from '../../../db';
import crypto from 'node:crypto';
import { rateLimit, buildRateLimitKey } from '../../../helpers/rateLimit';
import { createChallengeForKey } from '../../../helpers/webauthn';
import { createTempAuth } from '../../../helpers/passkeyAuth';
import { WEBAUTHN_RP_ID } from '../../../constants';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: buildRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
});

export const passkeyAuthOptions = new Elysia()
  .use(authLimiter)
  .post(
    '/passkey/options/auth',
    async ({ body, set }) => {
      const { username, password } = body;
      if (!username || !password) {
        set.status = 400;
        return { error: 'Missing username or password' };
      }

      const user = await getUserByUsername(username);
      if (!user) {
        set.status = 401;
        return { error: 'Invalid username or password' };
      }

      const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
      if (user.password_hash !== password_hash) {
        set.status = 401;
        return { error: 'Invalid username or password' };
      }

      // Require that the user has at least one registered passkey.
      if (!user.passkeys || user.passkeys.length === 0) {
        set.status = 400;
        return { error: 'No passkeys registered for this account' };
      }

      const tempToken = createTempAuth(user.username);
      const challenge = createChallengeForKey(`auth:${tempToken}`, user.username);

      return {
        options: {
          challenge,
          rpId: WEBAUTHN_RP_ID,
          timeout: 60000,
          userVerification: 'preferred',
          allowCredentials: user.passkeys.map(pk => ({
            id: pk.id,
            type: 'public-key',
            transports: pk.transports || [],
          })),
        },
        tempToken,
      };
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  );

export default passkeyAuthOptions;
