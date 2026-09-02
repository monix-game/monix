import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import { connectDB } from './db';
import { connectRedis, disconnectRedis } from './redis';

import { MONGO_URI, PORT, CORS_ORIGINS } from './constants';
import { attachSocketServer, setupSocketPublishers } from './socket';
import { ensureValidCertificate } from './certs';
import { logger, createLogger } from './logging';

import pingRoutes from './routes/ping';
import userRoutes from './routes/user';
import marketRoutes from './routes/market';
import settingsRoutes from './routes/settings';
import leaderboardRoutes from './routes/leaderboard';
import pollsRoutes from './routes/polls';
import resourcesRoutes from './routes/resources';
import appealsRoutes from './routes/appeals';
import hooksRoutes from './routes/hooks';
import fishingRoutes from './routes/fishing';
import petsRoutes from './routes/pets';
import socialRoutes from './routes/social';
import staffRoutes from './routes/staff';
import pushRoutes from './routes/push';

const log = createLogger('server');

const app = new Elysia()
  .use(
    cors({
      origin: (request) => {
        if (CORS_ORIGINS.includes('*')) return true;
        const origin = request.headers.get('origin');
        if (!origin) return true;
        return CORS_ORIGINS.includes(origin);
      },
    })
  )
  .onError(({ code, set, error }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: error.message };
    }
  })
  .group('/api/ping', app => app.use(pingRoutes))
  .group('/api/user', app => app.use(userRoutes))
  .group('/api/market', app => app.use(marketRoutes))
  .group('/api/settings', app => app.use(settingsRoutes))
  .group('/api/leaderboard', app => app.use(leaderboardRoutes))
  .group('/api/polls', app => app.use(pollsRoutes))
  .group('/api/resources', app => app.use(resourcesRoutes))
  .group('/api/appeals', app => app.use(appealsRoutes))
  .group('/api/hooks', app => app.use(hooksRoutes))
  .group('/api/fishing', app => app.use(fishingRoutes))
  .group('/api/pets', app => app.use(petsRoutes))
  .group('/api/social', app => app.use(socialRoutes))
  .group('/api/staff', app => app.use(staffRoutes))
  .group('/api/push', app => app.use(pushRoutes))
  .compile();

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function writeResponse(res: ServerResponse, response: Response) {
  const headers = new Headers(response.headers);
  const body = Buffer.from(await response.arrayBuffer());

  // Gzip-compress JSON/text responses when the client accepts it. Compression
  // happens here (at the Node HTTP boundary) rather than via an Elysia plugin
  // because this stack hand-rolls the Request/Response bridge in handleRequest.
  if (body.length > 512) {
    const encodings = (headers.get('accept-encoding') || '').split(',').map(e => e.trim().toLowerCase());
    if (encodings.includes('gzip')) {
      const compressed = gzipSync(body);
      if (compressed.length < body.length) {
        headers.set('content-encoding', 'gzip');
        headers.set('vary', 'accept-encoding');
        res.writeHead(response.status, Object.fromEntries(headers.entries()));
        res.end(compressed);
        return;
      }
    }
  }

  res.writeHead(response.status, Object.fromEntries(headers.entries()));
  res.end(body);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }
    // The client's real IP is available from the socket, but the `Request` we
    // build below has no way to carry it. When no reverse proxy already set a
    // forwarding header, inject the socket address as `x-real-ip` so the auth
    // middleware can record it in the user's IP history.
    if (
      !req.headers['x-forwarded-for'] &&
      !req.headers['x-real-ip'] &&
      !req.headers['client-ip'] &&
      req.socket.remoteAddress
    ) {
      headers.set('x-real-ip', String(req.socket.remoteAddress).replace(/^::ffff:/, ''));
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? (await readBody(req)).toString('utf8') : undefined;
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(hasBody ? { body } : {}),
    });
    const response = await app.fetch(request);
    await writeResponse(res, response);
  } catch (err) {
    log.error({ err }, 'Request handler error');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

async function start() {
  await connectDB(MONGO_URI);
  await connectRedis();

  const certConfig = await ensureValidCertificate();
  let server: ReturnType<typeof createServer>;

  if (certConfig) {
    const key = fs.readFileSync(certConfig.keyPath);
    const cert = fs.readFileSync(certConfig.certPath);
    server = createHttpsServer({ key, cert }, (req, res) => {
      void handleRequest(req, res);
    });
    log.info('HTTPS server created with TLS certificates');
  } else {
    server = createServer((req, res) => {
      void handleRequest(req, res);
    });
    log.info('HTTP server created (TLS disabled)');
  }

  attachSocketServer(server);
  setupSocketPublishers();
  server.listen(PORT, () => {
    const protocol = certConfig ? 'https' : 'http';
    log.info(`Server started on ${protocol}://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => {
    log.info('Shutting down...');
    server.close();
    await disconnectRedis();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(err => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
