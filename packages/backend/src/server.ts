import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import type { WebSocketServer } from 'ws';
import { pubsub } from './pubsub/index.js';
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

      // Avatar upload endpoint
      if (pathname === '/api/avatars' && req.method === 'POST') {
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

  return { wss, httpServer };
}
