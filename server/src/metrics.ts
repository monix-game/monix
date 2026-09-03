import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'monix_' });

export const httpRequestsTotal = new Counter({
  name: 'monix_http_requests_total',
  help: 'Total HTTP requests handled by the server.',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'monix_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const mongoOperationsTotal = new Counter({
  name: 'monix_mongo_operations_total',
  help: 'MongoDB operations issued by the application.',
  labelNames: ['operation', 'collection'],
  registers: [registry],
});

export const redisOperationsTotal = new Counter({
  name: 'monix_redis_operations_total',
  help: 'Redis cache operations issued by the application.',
  labelNames: ['operation', 'result'],
  registers: [registry],
});

export const websocketConnections = new Gauge({
  name: 'monix_websocket_connections',
  help: 'Currently connected WebSocket clients.',
  registers: [registry],
});

export const websocketMessagesTotal = new Counter({
  name: 'monix_websocket_messages_total',
  help: 'WebSocket messages received by operation.',
  labelNames: ['operation'],
  registers: [registry],
});

export const websocketBackpressureSkipsTotal = new Counter({
  name: 'monix_websocket_backpressure_skips_total',
  help: 'Broadcast messages skipped because a client was backpressured.',
  registers: [registry],
});

export const userMutationDuration = new Histogram({
  name: 'monix_user_mutation_duration_seconds',
  help: 'Duration of serialized user mutations in seconds.',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const userMutationQueue = new Gauge({
  name: 'monix_user_mutation_queue',
  help: 'Number of users currently waiting in the mutation queue.',
  registers: [registry],
});

export const dashboardStats = new Gauge({
  name: 'monix_dashboard_stats',
  help: 'Business statistics shown on the staff dashboard.',
  labelNames: ['stat'],
  registers: [registry],
});

export async function metricsText(): Promise<string> {
  return registry.metrics();
}
