import { WebSocketServer } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { useServer } from 'graphql-ws/lib/use/ws';
import { schema } from './graphql/resolvers.js';
import { createContext, removeContext, getContext } from './graphql/context.js';
import { roomManager } from './services/room-manager.js';
import { pubsub } from './pubsub/index.js';
import type { ConnectionContext } from '@boardsesh/shared-schema';

// Type for storing context in ws extra
interface Extra {
  context?: ConnectionContext;
}

export function startServer(): { wss: WebSocketServer; httpServer: ReturnType<typeof createServer> } {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const BOARDSESH_URL = process.env.BOARDSESH_URL || 'https://boardsesh.com';
  // Create HTTP server for health checks and join route
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }));
      return;
    }

    if (req.url === '/join' && req.method === 'GET') {
      const activeSession = roomManager.getActiveSession();
      if (!activeSession) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No active session' }));
        return;
      }

      // Construct the daemon WebSocket URL from the request host
      const host = req.headers.host || `localhost:${PORT}`;
      const daemonUrl = `ws://${host}/graphql`;
      const redirectUrl = `${BOARDSESH_URL}${activeSession.boardPath}?daemonUrl=${encodeURIComponent(daemonUrl)}`;

      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // Create WebSocket server on /graphql path
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  console.log(`BoardSesh Daemon starting on port ${PORT}...`);

  // Use graphql-ws server
  useServer(
    {
      schema,
      // onConnect is called ONCE when client connects and sends ConnectionInit
      onConnect: async (ctx) => {
        // Create context on initial connection
        const context = createContext();
        roomManager.registerClient(context.connectionId);
        console.log(`Client connected: ${context.connectionId}`);

        // Store context in ctx.extra for access in other hooks
        (ctx.extra as Extra).context = context;

        return true; // Allow connection
      },
      // context is called for EACH operation - return the stored context
      context: async (ctx): Promise<ConnectionContext> => {
        const extra = ctx.extra as Extra;
        if (!extra.context) {
          // This shouldn't happen if onConnect worked, but handle gracefully
          console.warn('No context found in extra, creating new one');
          const context = createContext();
          roomManager.registerClient(context.connectionId);
          extra.context = context;
        }
        // Return a fresh reference to the context (it may have been updated)
        return getContext(extra.context.connectionId) || extra.context;
      },
      onDisconnect: async (ctx, code, reason) => {
        const context = (ctx.extra as Extra)?.context;
        if (context) {
          console.log(`Client disconnected: ${context.connectionId} (code: ${code})`);

          // Get the latest context state (sessionId may have been updated)
          const latestContext = getContext(context.connectionId);

          // Handle session cleanup
          if (latestContext?.sessionId) {
            const result = await roomManager.leaveSession(context.connectionId);

            if (result) {
              // Notify session about user leaving
              if (latestContext.userId) {
                pubsub.publishSessionEvent(result.sessionId, {
                  __typename: 'UserLeft',
                  userId: latestContext.userId,
                });
              }

              // Notify about new leader if changed
              if (result.newLeaderId) {
                pubsub.publishSessionEvent(result.sessionId, {
                  __typename: 'LeaderChanged',
                  leaderId: result.newLeaderId,
                });
              }
            }
          }

          roomManager.removeClient(context.connectionId);
          removeContext(context.connectionId);
        }
      },
      onSubscribe: (ctx, msg) => {
        console.log(`Subscription started: ${msg.payload.operationName || 'anonymous'}`);
      },
      onError: (ctx, msg, errors) => {
        console.error('GraphQL error:', errors);
      },
      onComplete: (ctx, msg) => {
        console.log('Subscription completed');
      },
    },
    wss
  );

  // Start HTTP server (WebSocket server is attached to it)
  httpServer.listen(PORT, () => {
    console.log(`BoardSesh Daemon is running on port ${PORT}`);
    console.log(`  GraphQL WS: ws://0.0.0.0:${PORT}/graphql`);
    console.log(`  Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`  Join session: http://0.0.0.0:${PORT}/join`);
  });

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error);
  });

  return { wss, httpServer };
}
