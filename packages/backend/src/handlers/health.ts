import type { IncomingMessage, ServerResponse } from 'http';
import { applyCorsHeaders } from './cors';
import { pubsub } from '../pubsub/index';

/**
 * Health check endpoint handler
 * GET /health
 */
export async function handleHealthCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!applyCorsHeaders(req, res)) return;

  const redisRequired = pubsub.isRedisRequired();
  const redisConnected = pubsub.isRedisConnected();

  // If Redis is required but not connected, report unhealthy
  if (redisRequired && !redisConnected) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: Date.now(),
        redis: { required: true, connected: false },
      }),
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
      redis: { required: redisRequired, connected: redisConnected },
    }),
  );
}
