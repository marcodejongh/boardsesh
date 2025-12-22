import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink, access } from 'fs/promises';
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

export function startServer(): { wss: WebSocketServer; httpServer: ReturnType<typeof createServer> } {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const BOARDSESH_URL = process.env.BOARDSESH_URL || 'https://boardsesh.com';

  // Create Express app
  const app = express();

  // CORS middleware for all routes
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: Date.now() });
  });

  // Join session endpoint
  app.get('/join', (req: Request, res: Response) => {
    const activeSession = roomManager.getActiveSession();
    if (!activeSession) {
      res.status(404).json({ error: 'No active session' });
      return;
    }

    // Construct the daemon WebSocket URL from the request host
    const host = req.headers.host || `localhost:${PORT}`;
    const daemonUrl = `ws://${host}/graphql`;
    const redirectUrl = `${BOARDSESH_URL}${activeSession.boardPath}?daemonUrl=${encodeURIComponent(daemonUrl)}`;

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
      onDisconnect: async (ctx, code, _reason) => {
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
      onSubscribe: (_ctx, msg) => {
        console.log(`Subscription started: ${msg.payload.operationName || 'anonymous'}`);
      },
      onError: (_ctx, _msg, errors) => {
        console.error('GraphQL error:', errors);
      },
      onComplete: (_ctx, _msg) => {
        console.log('Subscription completed');
      },
    },
    wss,
  );

  // Start HTTP server (WebSocket server is attached to it)
  httpServer.listen(PORT, () => {
    console.log(`BoardSesh Daemon is running on port ${PORT}`);
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
