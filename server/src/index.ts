import express, { Request, RequestHandler } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { connectDB, getSessionByToken } from './db';

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

// General rate limiter: 200 requests per 15 minutes per IP
const generalLimiter = (rateLimit as (options: Record<string, unknown>) => RequestHandler)({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: async (req: Request) => {
    const ip = getRequestIp(req) ?? req.ip;

    // Attempt to get the user uuid from token if available for more accurate rate limiting
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await getSessionByToken(token);
      if (session) {
        return `user:${session.user_uuid}:${ip}`;
      }
    }

    if (ip) {
      return `ip:${ip}`;
    }

    // Fallback: derive a more specific key when IP cannot be determined
    const userAgentHeader = req.headers['user-agent'];
    const acceptLanguageHeader = req.headers['accept-language'];

    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join(', ')
      : userAgentHeader || 'unknown-ua';

    const acceptLanguage = Array.isArray(acceptLanguageHeader)
      ? acceptLanguageHeader.join(', ')
      : acceptLanguageHeader || 'unknown-lang';

    const fallbackKey = `noip:${userAgent}:${acceptLanguage}`;

    // Log for monitoring potential abuse when IP is unavailable
    console.warn('Rate limit fallback key used (no IP detected)', {
      path: req.path,
      ua: userAgent,
      lang: acceptLanguage,
    });

    return fallbackKey;
  },
  message: { error: 'Too many requests, please try again later.' },
  // Do not rate limit Stripe webhooks to avoid missing payment notifications
  skip: (req: Request) => req.path.startsWith('/api/hooks/stripe'),
});

app.use('/api/', generalLimiter);

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
