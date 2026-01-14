import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import marketRouter from './routes/market';
import resourcesRouter from './routes/resources';
import { CORS_ORIGINS, MONGO_URI, PORT } from './config';
import { connectDB } from './db';

dotenv.config();

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

app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api/resources', resourcesRouter);

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
