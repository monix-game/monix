import { Elysia, t } from 'elysia';
import { getUserByUsername } from '../../db';
import crypto from 'node:crypto';
import { rateLimit, buildRateLimitKey } from '../../helpers/rateLimit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: buildRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
});

export const needs2fa = new Elysia()
  .use(authLimiter)
  .post(
    '/needs-2fa',
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

      set.status = 200;
      return { needs_2fa: user.setup_totp };
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  );

export default needs2fa;
