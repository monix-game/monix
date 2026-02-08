import Filter from '../common/filter/filter';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

export const PORT = Number(process.env.PORT || 6200);

const rawOrigins = process.env.CORS_ORIGINS || '*';
export const CORS_ORIGINS = rawOrigins
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/monix';
export const SESSION_EXPIRES_IN = Number(process.env.SESSION_EXPIRES_IN || 172800); // default 2 days
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const PRICE_ID_GEMS_PACK_100 = process.env.PRICE_ID_GEMS_PACK_100 || '';
export const PRICE_ID_GEMS_PACK_500 = process.env.PRICE_ID_GEMS_PACK_500 || '';
export const PRICE_ID_GEMS_PACK_1000 = process.env.PRICE_ID_GEMS_PACK_1000 || '';

export const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });

export const profanityFilter = new Filter();
