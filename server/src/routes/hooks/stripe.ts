import { Elysia } from 'elysia';
import { v4 } from 'uuid';
import { STRIPE_WEBHOOK_SECRET, stripe } from '../../constants';
import { getUserByUsername, updateUser } from '../../db';
import Stripe from 'stripe';
import { buildRequestLogData, log } from '../../helpers/logging';
import { GEMS_LOOKUP } from './config';
import { createLogger } from '../../logging';

const slog = createLogger('stripe');

export const stripeWebhook = new Elysia().post('/stripe', async ({ request, headers, set }) => {
  const payload = await request.text();
  const sig = (headers['stripe-signature'] as string) || '';

  try {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const username = session.metadata?.username;
      const item_key = session.metadata?.item;

      if (!username || !item_key) {
        slog.warn('Stripe webhook missing metadata');
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook missing metadata',
          data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
        });
        set.status = 400;
        return 'Missing metadata';
      }

      const user = await getUserByUsername(username);
      if (!user) {
        slog.warn({ username }, 'Stripe webhook user not found');
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook user not found',
          data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
        });
        set.status = 404;
        return 'User not found';
      }

      const gemsAmount = GEMS_LOOKUP[item_key];
      if (!gemsAmount) {
        slog.warn({ item_key }, 'Stripe webhook unknown product');
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook unknown product',
          data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
          username: user.username,
        });
        set.status = 400;
        return 'Unknown gems product ID';
      }

      user.gems += gemsAmount;
      await updateUser(user);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'payment',
        message: 'Stripe webhook credited gems',
        data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
          { key: 'event', value: event.type },
          { key: 'username', value: username },
          { key: 'item', value: item_key },
          { key: 'gems', value: gemsAmount },
        ]),
        username: user.username,
      });
    }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      slog.error({ err: err.message }, 'Webhook signature verification failed');
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe webhook signature verification failed',
        data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
          { key: 'error', value: err.message, inline: false },
        ]),
      });
      set.status = 400;
      return `Webhook Error: ${err.message}`;
    } else {
      slog.error({ err }, 'Stripe webhook error');
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe webhook error',
        data: buildRequestLogData({ path: '/stripe', method: 'POST', headers }, [
          { key: 'error', value: err instanceof Error ? err.message : 'Unknown error' },
        ]),
      });
      set.status = 400;
      return `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }

  return { success: true };
});

export default stripeWebhook;
