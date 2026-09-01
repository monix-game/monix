import { Elysia, t } from 'elysia';
import { getUserByUsername, createUser } from '../../db';
import { IUser } from '../../../common/models/user';
import { v4 } from 'uuid';
import crypto from 'node:crypto';
import { profanityFilter } from '../../constants';
import { DEFAULT_SETTINGS } from '../../../common/models/settings';
import { rateLimit, buildRateLimitKey } from '../../helpers/rateLimit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: buildRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
});

export const register = new Elysia()
  .use(authLimiter)
  .post(
    '/register',
    async ({ body, set }) => {
      const { username, password } = body;

      if (!username || !password) {
        set.status = 400;
        return { error: 'Missing username or password' };
      }

      const existing = await getUserByUsername(username);
      if (existing) {
        set.status = 400;
        return { error: 'Username already exists' };
      }

      // Make sure username is 3-15 characters and only contains letters, numbers, underscores, hyphens
      const usernameRegex = /^[a-zA-Z0-9_-]{3,15}$/;
      if (!usernameRegex.test(username)) {
        set.status = 400;
        return {
          error:
            'Invalid username. Usernames can only contain letters, numbers, underscores, and hyphens, and must be between 3 and 15 characters long.',
        };
      }

      // Make sure password is at least 6 characters
      if (password.length < 6) {
        set.status = 400;
        return { error: 'Password must be at least 6 characters long' };
      }

      // Make sure the username isn't profane
      if (profanityFilter.isProfane(username)) {
        set.status = 400;
        return { error: 'Username contains inappropriate language' };
      }

      const password_hash = crypto.createHash('sha256').update(String(password)).digest('hex');
      const user: IUser = {
        uuid: v4(),
        username,
        password_hash,
        money: 1000,
        gems: 0,
        pet_slots: 3,
        daily_rewards: { last_claimed_day: 0, streak: 0 },
        completed_tutorial: false,
        role: 'user',
        time_created: Date.now() / 1000,
        last_seen: Date.now() / 1000,
        settings: DEFAULT_SETTINGS,
        resources: {},
      };

      await createUser(user);
      set.status = 201;
      return { message: 'User registered successfully' };
    },
    {
      body: t.Object({
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  );

export default register;
