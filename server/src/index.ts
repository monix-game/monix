import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
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

export const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' });

import userRouter from './routes/user';
import marketRouter from './routes/market';
import resourcesRouter from './routes/resources';
import petsRouter from './routes/pets';
import settingsRouter from './routes/settings';
import leaderboardRouter from './routes/leaderboard';
import hooksRouter from './routes/hooks';

const app = express();
app.use(express.json());

// Configure CORS: allow all if '*' present, otherwise only listed origins.
if (CORS_ORIGINS.includes('*')) {
  app.use(cors());
} else {
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow non-browser tools (curl, server-to-server) with no origin
        if (!origin) return callback(null, true);
        if (CORS_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
    })
  );
}

app.use('/api/user', userRouter);
app.use('/api/market', marketRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/pets', petsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/hooks', hooksRouter);

async function start() {
  await connectDB(MONGO_URI);
  app.listen(PORT, () => {
    console.log(`Starting server on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
