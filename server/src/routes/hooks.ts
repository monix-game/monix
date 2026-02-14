import express, { Router } from 'express';
import {
  PRICE_ID_GEMS_PACK_100,
  PRICE_ID_GEMS_PACK_1000,
  PRICE_ID_GEMS_PACK_500,
  STRIPE_WEBHOOK_SECRET,
  stripe,
} from '../constants';
import { getUserByUsername, updateUser } from '../db';
import Stripe from 'stripe';
import { v4 } from 'uuid';
import { buildRequestLogData, log } from '../helpers/logging';

const router = Router();

const GEMS_LOOKUP: { [key: string]: number } = {
  gems_pack_100: 100,
  gems_pack_500: 500,
  gems_pack_1000: 1000,
};

const PRICE_IDS: { [key: string]: string } = {
  gems_pack_100: PRICE_ID_GEMS_PACK_100,
  gems_pack_500: PRICE_ID_GEMS_PACK_500,
  gems_pack_1000: PRICE_ID_GEMS_PACK_1000,
};

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // @ts-expect-error We set rawBody in index.ts
  const payload = req.rawBody as string;
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const username = session.metadata?.username;
      const item_key = session.metadata?.item;

      if (!username || !item_key) {
        console.error('⚠️  Missing metadata in Stripe session');
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook missing metadata',
          data: buildRequestLogData(req, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
        });
        return res.status(400).send('Missing metadata');
      }

      const user = await getUserByUsername(username);

      if (!user) {
        console.error('⚠️  User not found for username:', username);
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook user not found',
          data: buildRequestLogData(req, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
        });
        return res.status(404).send('User not found');
      }

      const gemsAmount = GEMS_LOOKUP[item_key];
      if (!gemsAmount) {
        console.error('⚠️  Unknown gems product ID:', item_key);
        await log({
          uuid: v4(),
          timestamp: new Date(),
          level: 'warn',
          type: 'payment',
          message: 'Stripe webhook unknown product',
          data: buildRequestLogData(req, [
            { key: 'event', value: event.type },
            { key: 'username', value: username },
            { key: 'item', value: item_key },
          ]),
          username: user.username,
        });
        return res.status(400).send('Unknown gems product ID');
      }

      user.gems += gemsAmount;
      await updateUser(user);

      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'info',
        type: 'payment',
        message: 'Stripe webhook credited gems',
        data: buildRequestLogData(req, [
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
      console.error('⚠️  Webhook signature verification failed.', err.message);
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe webhook signature verification failed',
        data: buildRequestLogData(req, [
          { key: 'error', value: err.message, inline: false },
        ]),
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    } else {
      console.error('⚠️  Webhook error:', err);
      await log({
        uuid: v4(),
        timestamp: new Date(),
        level: 'error',
        type: 'payment',
        message: 'Stripe webhook error',
        data: buildRequestLogData(req, [
          { key: 'error', value: err instanceof Error ? err.message : 'Unknown error' },
        ]),
      });
      return res
        .status(400)
        .send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Return a response to acknowledge receipt of the event
  res.json({ success: true });
});

router.post('/session', async (req, res) => {
  const { item, username } = req.body as { item?: string; username?: string };

  if (!item || !GEMS_LOOKUP[item]) {
    return res.status(400).json({ error: 'Invalid or missing item type' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  const priceId = PRICE_IDS[item];
  if (!priceId) {
    await log({
      uuid: v4(),
      timestamp: new Date(),
      level: 'error',
      type: 'payment',
      message: 'Stripe session price ID missing',
      data: buildRequestLogData(req, [
        { key: 'item', value: item },
        { key: 'username', value: username },
      ]),
    });
    return res.status(500).json({ error: 'Price ID not configured for this item' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://monixga.me/payment/success',
      cancel_url: 'https://monixga.me/payment/cancel',
      metadata: { username, item },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('⚠️  Stripe error:', err);
    await log({
      uuid: v4(),
      timestamp: new Date(),
      level: 'error',
      type: 'payment',
      message: 'Stripe session creation failed',
      data: buildRequestLogData(req, [
        { key: 'item', value: item },
        { key: 'username', value: username },
        { key: 'error', value: err instanceof Error ? err.message : 'Stripe error' },
      ]),
    });
    return res.status(500).json({ error: 'Stripe error' });
  }
});

export default router;
