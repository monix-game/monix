import { Router } from 'express';
import {
  PRICE_ID_GEMS_PACK_100,
  PRICE_ID_GEMS_PACK_1000,
  PRICE_ID_GEMS_PACK_500,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from '../index';
import Stripe from 'stripe';
import { getUserByUsername, updateUser } from '../db';

const router = Router();

const stripe = new Stripe(STRIPE_SECRET_KEY);

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

router.get('/stripe', async (req, res) => {
  const payload = req.body as string;
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const username = session.metadata?.username;
      const item_key = session.metadata?.item;

      if (!username || !item_key) {
        console.error('⚠️  Missing metadata in Stripe session');
        return res.status(400).send('Missing metadata');
      }

      const user = await getUserByUsername(username);

      if (!user) {
        console.error('⚠️  User not found for username:', username);
        return res.status(404).send('User not found');
      }

      const gemsAmount = GEMS_LOOKUP[item_key];
      if (!gemsAmount) {
        console.error('⚠️  Unknown gems product ID:', item_key);
        return res.status(400).send('Unknown gems product ID');
      }

      user.gems += gemsAmount;
      await updateUser(user);
    }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.error('⚠️  Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    } else {
      console.error('⚠️  Webhook error:', err);
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://monix.proplayer919.dev/payment/success',
      cancel_url: 'https://monix.proplayer919.dev/payment/cancel',
      metadata: { username, item },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('⚠️  Stripe error:', err);
    return res.status(500).json({ error: 'Stripe error' });
  }
});

export default router;
