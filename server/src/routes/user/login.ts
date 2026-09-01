import { Elysia, t } from 'elysia';
import { getUserByUsername, createSession } from '../../db';
import { sessionToDoc } from '../../../common/models/session';
import crypto from 'node:crypto';
import { v4 } from 'uuid';
import { SESSION_EXPIRES_IN } from '../../constants';
import { verifyTOTPToken } from '../../helpers/totp';
import { rateLimit, buildRateLimitKey } from '../../helpers/rateLimit';

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
      const { username, password, token } = body;

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

      if (user.setup_totp) {
        if (!token) {
          set.status = 400;
          return { error: '2FA token required' };
        }

        const isTokenValid = verifyTOTPToken(user.totp_secret!, token);
        if (!isTokenValid) {
          set.status = 401;
          return { error: 'Invalid 2FA token' };
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
      }),
    }
  );

export default login;
