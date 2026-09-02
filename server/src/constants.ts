import Filter from '../common/filter/filter';
import Stripe from 'stripe';
import webPush from 'web-push';
import { DiscordClient } from './helpers/discord';
import path from 'node:path';

export const PORT = Number(process.env.PORT || 6200);

const rawOrigins = process.env.CORS_ORIGINS || '*';
export const CORS_ORIGINS = rawOrigins
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/monix';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const SESSION_EXPIRES_IN = Number(process.env.SESSION_EXPIRES_IN || 172800); // default 2 days
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const PRICE_ID_GEMS_PACK_100 = process.env.PRICE_ID_GEMS_PACK_100 || '';
export const PRICE_ID_GEMS_PACK_500 = process.env.PRICE_ID_GEMS_PACK_500 || '';
export const PRICE_ID_GEMS_PACK_1000 = process.env.PRICE_ID_GEMS_PACK_1000 || '';

export const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-08-26.dahlia' });

export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
export const discordClient = new DiscordClient(DISCORD_WEBHOOK_URL);

export const SERVER_PUBLIC_IP = process.env.SERVER_PUBLIC_IP || '';

export const WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
export const WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Monix';

export const ENABLE_TLS = process.env.ENABLE_TLS === 'true';
export const CERT_DIR = process.env.CERT_DIR || path.join(process.cwd(), 'certs');
export const CERT_PATH = process.env.CERT_PATH || path.join(CERT_DIR, 'cert.pem');
export const KEY_PATH = process.env.KEY_PATH || path.join(CERT_DIR, 'key.pem');
export const ACCOUNT_KEY_PATH = process.env.ACCOUNT_KEY_PATH || path.join(CERT_DIR, 'account.pem');

export const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN || '';
export const NETLIFY_ZONE_NAME = process.env.NETLIFY_ZONE_NAME || '';
export const DOMAIN_NAME = process.env.DOMAIN_NAME || '';
export const ACME_EMAIL = process.env.ACME_EMAIL || '';

export const profanityFilter = new Filter();

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:monix@proplayer919.dev';
export const VAPID_CONFIGURED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (VAPID_CONFIGURED) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
export { webPush };
