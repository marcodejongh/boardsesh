import { WebSocketServer, type WebSocket } from 'ws';
import { createServer, type IncomingMessage } from 'http';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink, access } from 'fs/promises';
import { useServer, type Extra as WsExtra } from 'graphql-ws/use/ws';
import type { Context as GqlWsContext } from 'graphql-ws';
import { schema } from './graphql/resolvers.js';
import { createContext, removeContext, getContext } from './graphql/context.js';
import { roomManager } from './services/room-manager.js';
import { pubsub } from './pubsub/index.js';
import { validateNextAuthToken, extractAuthToken } from './middleware/auth.js';
import type { ConnectionContext } from '@boardsesh/shared-schema';

// Extend Extra type with our custom context
interface CustomExtra extends WsExtra {
  context?: ConnectionContext;
  [key: PropertyKey]: unknown;
}

// Type alias for convenience
type ServerContext = GqlWsContext<Record<string, unknown>, CustomExtra>;

// Avatar upload configuration
const AVATARS_DIR = './avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// UUID validation regex for path traversal prevention
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUserId(userId: string): boolean {
  return UUID_REGEX.test(userId);
}

// Ensure avatars directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// Configure multer for avatar uploads - use memory storage since we need userId from body
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// Helper to delete existing avatars for a user (all extensions)
const deleteExistingAvatars = async (userId: string): Promise<void> => {
  const extensions = ['jpg', 'png', 'gif', 'webp'];
  for (const ext of extensions) {
    const filePath = path.join(AVATARS_DIR, `${userId}.${ext}`);
    try {
      await access(filePath);
      await unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }
};

// Vercel preview deployment pattern: https://boardsesh-{hash}-marcodejonghs-projects.vercel.app
const VERCEL_PREVIEW_REGEX = /^https:\/\/boardsesh-[a-z0-9]+-marcodejonghs-projects\.vercel\.app$/;

export function startServer(): { wss: WebSocketServer; httpServer: ReturnType<typeof createServer> } {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const BOARDSESH_URL = process.env.BOARDSESH_URL || 'https://boardsesh.com';

  // Build allowed origins list for CORS
  const ALLOWED_ORIGINS = [BOARDSESH_URL];
  // Also allow www subdomain variant
  try {
    const url = new URL(BOARDSESH_URL);
    if (!url.hostname.startsWith('www.')) {
      ALLOWED_ORIGINS.push(`${url.protocol}//www.${url.hostname}`);
    }
  } catch {
    // Invalid URL, skip www variant
  }
  if (process.env.NODE_ENV !== 'production') {
    ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  // Helper to check if an origin is allowed (includes Vercel preview deployments)
  const isOriginAllowed = (origin: string): boolean => {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    return VERCEL_PREVIEW_REGEX.test(origin);
  };

  // Create Express app
  const app = express();

  // CORS middleware for all routes - whitelist specific origins
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: Date.now() });
  });

  // Join session endpoint - requires session ID parameter
  app.get('/join/:sessionId', async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const sessionInfo = await roomManager.getSessionById(sessionId);
    if (!sessionInfo) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Construct the backend WebSocket URL from the request host
    const host = req.headers.host || `localhost:${PORT}`;
    const backendUrl = `ws://${host}/graphql`;
    const redirectUrl = `${BOARDSESH_URL}${sessionInfo.boardPath}?backendUrl=${encodeURIComponent(backendUrl)}&sessionId=${encodeURIComponent(sessionId)}`;

    res.redirect(302, redirectUrl);
  });

  // Avatar upload endpoint
  app.post('/api/avatars', (req: Request, res: Response, next: NextFunction) => {
    // Use multer's single file upload
    upload.single('avatar')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File size must be less than 2MB' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      } else if (err) {
        res.status(400).json({ error: err.message });
        return;
      }

      const userId = req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      // Validate userId format to prevent path traversal attacks
      if (!validateUserId(userId)) {
        res.status(400).json({ error: 'Invalid userId format' });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Delete any existing avatars for this user (all extensions)
      await deleteExistingAvatars(userId);

      // Determine file extension and save the file from memory to disk
      const ext = MIME_TO_EXT[req.file.mimetype] || 'jpg';
      const filePath = path.join(AVATARS_DIR, `${userId}.${ext}`);

      try {
        await writeFile(filePath, req.file.buffer);
      } catch (writeErr) {
        console.error('Failed to write avatar file:', writeErr);
        res.status(500).json({ error: 'Failed to save avatar' });
        return;
      }

      const avatarUrl = `/static/avatars/${userId}.${ext}`;
      res.json({ success: true, avatarUrl });
    });
  });

  // Serve static avatar files with caching
  app.use(
    '/static/avatars',
    express.static(AVATARS_DIR, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
    }),
  );

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Create HTTP server from Express app
  const httpServer = createServer(app);

  // Create WebSocket server on /graphql path with origin validation
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
    verifyClient: (info: { origin: string; req: IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void) => {
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

  console.log(`Boardsesh Backend starting on port ${PORT}...`);

  // Use graphql-ws server
  useServer<Record<string, unknown>, CustomExtra>(
    {
      schema,
      // onConnect is called ONCE when client connects and sends ConnectionInit
      onConnect: async (ctx: ServerContext) => {
        // Extract and validate auth token
        const token = extractAuthToken(
          ctx.connectionParams as Record<string, unknown> | undefined,
          ctx.extra.request?.url
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
          // This shouldn't happen if onConnect worked, but handle gracefully
          console.warn('No context found in extra, creating new one');
          const context = createContext();
          roomManager.registerClient(context.connectionId);
          extra.context = context;
        }
        // Return a fresh reference to the context (it may have been updated)
        return getContext(extra.context.connectionId) || extra.context;
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

  // Start HTTP server (WebSocket server is attached to it)
  httpServer.listen(PORT, () => {
    console.log(`Boardsesh Backend is running on port ${PORT}`);
    console.log(`  GraphQL WS: ws://0.0.0.0:${PORT}/graphql`);
    console.log(`  Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`  Join session: http://0.0.0.0:${PORT}/join`);
    console.log(`  Avatar upload: http://0.0.0.0:${PORT}/api/avatars`);
    console.log(`  Avatar files: http://0.0.0.0:${PORT}/static/avatars/`);
  });

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error);
  });

  return { wss, httpServer };
}
