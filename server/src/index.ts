import express, { Request, RequestHandler } from 'express';
import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { connectDB } from './db';

import { MONGO_URI, PORT, CORS_ORIGINS } from './constants';
import { getRequestIp } from './helpers/ip';

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
import pingRouter from './routes/ping';
import pollsRouter from './routes/polls';

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

export const rateLimitKeyGenerator = (req: Request): string => {
  const requestIp = getRequestIp(req);

  let ip = 'unknown-ip';
  if (requestIp) {
    ip = ipKeyGenerator(requestIp);
  }

  const userAgent = req.get('user-agent') || 'unknown-ua';
  const acceptLanguage = req.get('accept-language') || 'unknown-lang';
  const forwardedProto = req.get('x-forwarded-proto') || 'unknown-proto';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const userId = (req as any).authUser?.uuid || 'anonymous';

  const key = `${ip}:${userId}:${userAgent}:${acceptLanguage}:${forwardedProto}`;

  return key;
};

// General rate limiter: 200 requests per 15 minutes per IP
const generalLimiter = (rateLimit as (options: Record<string, unknown>) => RequestHandler)({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req: Request) => req.path.startsWith('/api/hooks/stripe'),
});

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
app.use('/api/ping', pingRouter);
app.use('/api/polls', pollsRouter);

app.use('/api/', generalLimiter);

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
