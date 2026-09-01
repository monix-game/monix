import { Elysia, t } from 'elysia';
import { v4 } from 'uuid';
import { stripe } from '../../constants';
import { buildRequestLogData, log } from '../../helpers/logging';
import { GEMS_LOOKUP, PRICE_IDS } from './config';
import { createLogger } from '../../logging';
import { deriveAuth, onlyAuth, onlyFeatureEnabled } from '../../middleware';

const slog = createLogger('stripe');

export const createCheckoutSession = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyAuth)
  .onBeforeHandle(onlyFeatureEnabled('gemPurchases'))
  .post(
  '/session',
  async ({ body, set, headers }) => {
    const { item, username } = body;

    if (!item || !GEMS_LOOKUP[item]) {
      set.status = 400;
      return { error: 'Invalid or missing item type' };
    }

    if (!username) {
      set.status = 400;
      return { error: 'Missing username' };
    }

    const priceId = PRICE_IDS[item];
    if (!priceId) {
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe session price ID missing',
        data: buildRequestLogData({ path: '/session', method: 'POST', headers }, [
          { key: 'item', value: item },
          { key: 'username', value: username },
        ]),
      });
      set.status = 500;
      return { error: 'Price ID not configured for this item' };
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: 'https://monixga.me/payment/success',
        cancel_url: 'https://monixga.me/payment/cancel',
        metadata: { username, item },
      });

      return { url: session.url };
    } catch (err) {
      slog.error({ err }, 'Stripe error');
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe session creation failed',
        data: buildRequestLogData({ path: '/session', method: 'POST', headers }, [
          { key: 'item', value: item },
          { key: 'username', value: username },
          { key: 'error', value: err instanceof Error ? err.message : 'Stripe error' },
        ]),
      });
      set.status = 500;
      return { error: 'Stripe error' };
    }
  },
  {
    body: t.Object({
      item: t.Optional(t.String()),
      username: t.Optional(t.String()),
    }),
  }
);

export default createCheckoutSession;
