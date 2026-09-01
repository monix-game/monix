import { Elysia, t } from 'elysia';
import { getUserByUsername, createSession, updateUser } from '../../db';
import { sessionToDoc } from '../../../common/models/session';
import { v4 } from 'uuid';
import crypto from 'node:crypto';
import { SESSION_EXPIRES_IN, CORS_ORIGINS } from '../../constants';
import { rateLimit, buildRateLimitKey } from '../../helpers/rateLimit';
import { getTwoFactorState, verifySecondFactor } from '../../helpers/2fa';
import type { AuthenticationCredentialDTO } from '../../helpers/webauthn';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: buildRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
});

export const login = new Elysia()
  .use(authLimiter)
  .post(
    '/login',
    async ({ body, set }) => {
      const { username, password, token, recoveryCode, tempToken } = body;
      const passkeyCred =
        (body.passkeyCredential as AuthenticationCredentialDTO | undefined) ?? undefined;

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

      if (getTwoFactorState(user).needs_2fa) {
        const origins = CORS_ORIGINS.includes('*')
          ? ['http://localhost:5173', 'http://localhost:6200', 'https://monix.proplayer919.dev']
          : CORS_ORIGINS;

        const result = verifySecondFactor(user, {
          token,
          recoveryCode,
          tempToken,
          passkeyCredential: passkeyCred,
          origins,
        });

        if (!result.verified) {
          set.status = 401;
          return { error: result.reason };
        }

        // Persist any state changes (e.g. a consumed recovery code or passkey counter).
        if (result.changed) {
          await updateUser(result.user);
        }
      }

      const session_token = v4();
      const time_now = Date.now() / 1000;
      const session = {
        token: session_token,
        user_uuid: user.uuid,
        time_created: time_now,
        expires_at: time_now + SESSION_EXPIRES_IN,
      };
      await createSession(session);

      set.status = 200;
      return { message: 'Login successful', session: sessionToDoc(session) };
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
        token: t.Optional(t.String()),
        recoveryCode: t.Optional(t.String()),
        tempToken: t.Optional(t.String()),
        passkeyCredential: t.Optional(t.Any()),
      }),
    }
  );

export default login;
