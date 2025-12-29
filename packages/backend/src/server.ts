import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { WebSocketServer } from 'ws';
import { pubsub } from './pubsub/index.js';
import { roomManager } from './services/room-manager.js';
import { redisClientManager } from './redis/client.js';
import { initCors, applyCorsHeaders } from './handlers/cors.js';
import { handleHealthCheck } from './handlers/health.js';
import { handleSessionJoin } from './handlers/join.js';
import { handleAvatarUpload } from './handlers/avatars.js';
import { handleStaticAvatar } from './handlers/static.js';
import { createYogaInstance } from './graphql/yoga.js';
import { setupWebSocketServer } from './websocket/setup.js';

/**
 * Start the Boardsesh Backend server
 *
 * This server uses GraphQL Yoga for HTTP GraphQL requests and graphql-ws
 * for WebSocket subscriptions. Non-GraphQL routes are handled by custom
 * request handlers.
 */
export async function startServer(): Promise<{ wss: WebSocketServer; httpServer: ReturnType<typeof createServer> }> {
  // Initialize PubSub (connects to Redis if configured)
  // This must happen before we start accepting connections
  await pubsub.initialize();

  // Initialize RoomManager with Redis for session persistence
  if (redisClientManager.isRedisConfigured() && redisClientManager.isRedisConnected()) {
    const { publisher } = redisClientManager.getClients();
    await roomManager.initialize(publisher);
  } else {
    await roomManager.initialize(); // Postgres-only mode
  }

  const PORT = parseInt(process.env.PORT || '8080', 10);
  const BOARDSESH_URL = process.env.BOARDSESH_URL || 'https://boardsesh.com';

  // Initialize CORS with allowed origins
  initCors(BOARDSESH_URL);

  // Create GraphQL Yoga instance
  const yoga = createYogaInstance();

  /**
   * Custom request handler that routes requests to appropriate handlers
   */
  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // Health check endpoint
      if (pathname === '/health' && req.method === 'GET') {
        await handleHealthCheck(req, res);
        return;
      }

      // Session join redirect endpoint
      if (pathname.startsWith('/join/') && req.method === 'GET') {
        const sessionId = pathname.slice('/join/'.length);
        await handleSessionJoin(req, res, sessionId, PORT, BOARDSESH_URL);
        return;
      }

      // Avatar upload endpoint (handle OPTIONS for CORS preflight)
      if (pathname === '/api/avatars' && (req.method === 'POST' || req.method === 'OPTIONS')) {
        await handleAvatarUpload(req, res);
        return;
      }

      // Static avatar files
      if (pathname.startsWith('/static/avatars/')) {
        const fileName = pathname.slice('/static/avatars/'.length);
        if (fileName) {
          await handleStaticAvatar(req, res, fileName);
          return;
        }
      }

      // GraphQL endpoint - delegate to Yoga
      if (pathname === '/graphql') {
        // Apply CORS for GraphQL requests
        if (!applyCorsHeaders(req, res)) return;

        // Yoga handles the request and writes directly to the response
        await yoga.handle(req, res);
        return;
      }

      // 404 for all other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error('Request handler error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  }

  // Create HTTP server with custom request handler
  const httpServer = createServer(handleRequest);

  // Setup WebSocket server for GraphQL subscriptions
  const wss = setupWebSocketServer(httpServer);

  console.log(`Boardsesh Backend starting on port ${PORT}...`);

  // Start HTTP server (WebSocket server is attached to it)
  httpServer.listen(PORT, () => {
    console.log(`Boardsesh Backend is running on port ${PORT}`);
    console.log(`  GraphQL HTTP: http://0.0.0.0:${PORT}/graphql`);
    console.log(`  GraphQL WS: ws://0.0.0.0:${PORT}/graphql`);
    console.log(`  Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`  Join session: http://0.0.0.0:${PORT}/join/:sessionId`);
    console.log(`  Avatar upload: http://0.0.0.0:${PORT}/api/avatars`);
    console.log(`  Avatar files: http://0.0.0.0:${PORT}/static/avatars/`);
  });

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error);
  });

  // Graceful shutdown handler - flush pending writes
  process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, initiating graceful shutdown...');

    try {
      // Flush any pending debounced writes to Postgres
      await roomManager.flushPendingWrites();
      console.log('[Server] All pending writes flushed successfully');
    } catch (error) {
      console.error('[Server] Error flushing pending writes:', error);
    }

    // Close HTTP server
    httpServer.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('[Server] Forcefully shutting down after 10s timeout');
      process.exit(1);
    }, 10000);
  });

  // Also handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('[Server] SIGINT received, initiating graceful shutdown...');

    try {
      await roomManager.flushPendingWrites();
      console.log('[Server] All pending writes flushed successfully');
    } catch (error) {
      console.error('[Server] Error flushing pending writes:', error);
    }

    httpServer.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Server] Forcefully shutting down after 10s timeout');
      process.exit(1);
    }, 10000);
  });

  // Optional: Periodic flush as backup (every 60 seconds)
  setInterval(async () => {
    try {
      await roomManager.flushPendingWrites();
    } catch (error) {
      console.error('[Server] Error in periodic flush:', error);
    }
  }, 60000);

  // Optional: Periodic TTL refresh for active sessions (every minute)
  setInterval(async () => {
    try {
      const activeSessions = roomManager.getAllActiveSessions();
      // Note: TTL refresh happens automatically in RedisSessionStore methods,
      // but we can add explicit refresh here if needed for extra safety
    } catch (error) {
      console.error('[Server] Error in periodic TTL refresh:', error);
    }
  }, 60000);

  return { wss, httpServer };
}
