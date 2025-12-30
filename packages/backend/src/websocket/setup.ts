import { WebSocketServer, type WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import { useServer, type Extra as WsExtra } from 'graphql-ws/use/ws';
import type { Context as GqlWsContext } from 'graphql-ws';
import { schema } from '../graphql/index.js';
import { createContext, removeContext, getContext } from '../graphql/context.js';
import { roomManager } from '../services/room-manager.js';
import { pubsub } from '../pubsub/index.js';
import { validateNextAuthToken, extractAuthToken } from '../middleware/auth.js';
import { isOriginAllowed } from '../handlers/cors.js';
import type { ConnectionContext } from '@boardsesh/shared-schema';

// Extend Extra type with our custom context
interface CustomExtra extends WsExtra {
  context?: ConnectionContext;
  [key: PropertyKey]: unknown;
}

// Type alias for convenience
type ServerContext = GqlWsContext<Record<string, unknown>, CustomExtra>;

/**
 * Setup WebSocket server with graphql-ws for GraphQL subscriptions
 *
 * @param httpServer The HTTP server to attach the WebSocket server to
 * @returns The WebSocket server instance
 */
export function setupWebSocketServer(httpServer: HttpServer): WebSocketServer {
  // Create WebSocket server on /graphql path with origin validation
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
    verifyClient: (
      info: { origin: string; req: IncomingMessage },
      callback: (res: boolean, code?: number, message?: string) => void,
    ) => {
      const origin = info.origin;

      // Allow connections without origin header (e.g., from native apps or direct WebSocket clients)
      if (!origin) {
        callback(true);
        return;
      }

      // Check if origin is in allowed list or matches Vercel preview pattern
      if (isOriginAllowed(origin)) {
        callback(true);
        return;
      }

      console.warn(`[WebSocket] Rejected connection from unauthorized origin: ${origin}`);
      callback(false, 403, 'Origin not allowed');
    },
  });

  // Use graphql-ws server
  useServer<Record<string, unknown>, CustomExtra>(
    {
      schema,
      // onConnect is called ONCE when client connects and sends ConnectionInit
      onConnect: async (ctx: ServerContext) => {
        // Extract and validate auth token
        const token = extractAuthToken(
          ctx.connectionParams as Record<string, unknown> | undefined,
          ctx.extra.request?.url,
        );

        let isAuthenticated = false;
        let authenticatedUserId: string | undefined;

        if (token) {
          const authResult = await validateNextAuthToken(token);
          if (authResult) {
            isAuthenticated = true;
            authenticatedUserId = authResult.userId;
            console.log(`[Auth] Authenticated user: ${authenticatedUserId}`);
          }
        }

        // Create context on initial connection with auth info
        const context = createContext(undefined, isAuthenticated, authenticatedUserId);
        roomManager.registerClient(context.connectionId);
        console.log(`Client connected: ${context.connectionId} (authenticated: ${isAuthenticated})`);

        // Store context in ctx.extra for access in other hooks
        (ctx.extra as CustomExtra).context = context;

        return true; // Allow connection (both authenticated and unauthenticated)
      },
      // context is called for EACH operation - return the stored context
      context: async (ctx: ServerContext): Promise<ConnectionContext> => {
        const extra = ctx.extra as CustomExtra;

        if (!extra.context) {
          // This should never happen - onConnect should always set context
          console.error('[Context] CRITICAL: No context in extra - onConnect may have failed');
          throw new Error('Connection context not initialized - onConnect may have failed');
        }

        // Get the latest context (it may have been updated by mutations like joinSession)
        const latestContext = getContext(extra.context.connectionId);

        if (!latestContext) {
          console.error(`[Context] Context lost for connection ${extra.context.connectionId}`);
          throw new Error(`Connection context lost for ${extra.context.connectionId}`);
        }

        console.log(`[Context] Retrieved context: ${latestContext.connectionId}, sessionId: ${latestContext.sessionId}`);
        return latestContext;
      },
      onDisconnect: async (ctx: ServerContext, code?: number) => {
        const context = (ctx.extra as CustomExtra)?.context;
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
      onSubscribe: (_ctx: ServerContext, _id: string, payload) => {
        console.log(`Subscription started: ${payload.operationName || 'anonymous'}`);
      },
      onError: (_ctx: ServerContext, _id: string, _payload, errors) => {
        console.error('GraphQL error:', errors);
      },
      onComplete: (_ctx: ServerContext, _id: string, payload) => {
        console.log(`Subscription completed: ${payload.operationName || 'anonymous'}`);
      },
    },
    wss,
  );

  return wss;
}
