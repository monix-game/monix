import express from 'express';
import cors from 'cors';
import { connectDB } from './db';

import { MONGO_URI, PORT, CORS_ORIGINS } from './constants';

import userRouter from './routes/user';
import marketRouter from './routes/market';
import resourcesRouter from './routes/resources';
import petsRouter from './routes/pets';
import settingsRouter from './routes/settings';
import leaderboardRouter from './routes/leaderboard';
import hooksRouter from './routes/hooks';
import socialRouter from './routes/social';
import staffRouter from './routes/staff';
import appealRouter from './routes/appeals';
import fishingRouter from './routes/fishing';

const app = express();

// Disable headers revealing server information
app.disable('x-powered-by');

// Make this ignore raw body for the /hooks/stripe endpoint
app.use(
  express.json({
    limit: '200mb',
    verify: (req, res, buf) => {
      const url = req.url || '';
      if (url.startsWith('/api/hooks/stripe')) {
        // @ts-expect-error We need to set rawBody manually
        req.rawBody = buf.toString();
      }
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Configure CORS: allow all if '*' present, otherwise only listed origins.
if (CORS_ORIGINS.includes('*')) {
  app.use(cors());
} else {
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow non-browser tools (curl, server-to-server) with no origin
        if (!origin) return callback(null, true);
        if (CORS_ORIGINS.includes(origin)) return callback(null, true);
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
app.use('/api/social', socialRouter);
app.use('/api/staff', staffRouter);
app.use('/api/appeals', appealRouter);
app.use('/api/fishing', fishingRouter);

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
