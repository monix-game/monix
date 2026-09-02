import { Elysia, t } from 'elysia';
import { getUserByUUID, upsertPushSubscription } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const subscribePush = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/subscribe',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const fetchedUser = await getUserByUUID(user_uuid);
      if (!fetchedUser) {
        set.status = 404;
        return { error: 'User not found' };
      }

      const { endpoint, keys } = body as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        set.status = 400;
        return { error: 'endpoint and keys are required' };
      }

      await upsertPushSubscription({
        user_uuid,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        time_created: Date.now(),
      });

      return { success: true };
    },
    {
      body: t.Object({
        endpoint: t.String(),
        keys: t.Object({
          p256dh: t.String(),
          auth: t.String(),
        }),
      }),
    }
  );

export default subscribePush;
