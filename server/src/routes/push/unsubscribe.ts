import { Elysia, t } from 'elysia';
import { deletePushSubscriptionByEndpoint } from '../../db';
import { deriveAuth, onlyAuth } from '../../middleware';

export const unsubscribePush = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .post(
    '/unsubscribe',
    async ({ body, set }) => {
      const { endpoint } = body as { endpoint?: string };
      if (!endpoint) {
        set.status = 400;
        return { error: 'endpoint is required' };
      }
      await deletePushSubscriptionByEndpoint(endpoint);
      return { success: true };
    },
    {
      body: t.Object({
        endpoint: t.String(),
      }),
    }
  );

export default unsubscribePush;
