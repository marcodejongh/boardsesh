import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { handleConnection, handleDisconnection } from './handlers/connection.js';
import { handleMessage } from './handlers/message.js';
import { roomManager } from './services/room-manager.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const BOARDSESH_URL = process.env.BOARDSESH_URL || 'https://boardsesh.com';

export function startServer(): { wss: WebSocketServer; httpServer: ReturnType<typeof createServer> } {
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
      const daemonUrl = `ws://${host}`;
      const redirectUrl = `${BOARDSESH_URL}${activeSession.boardPath}?daemonUrl=${encodeURIComponent(daemonUrl)}`;

      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server: httpServer });

  console.log(`BoardSesh Daemon starting on port ${PORT}...`);

  wss.on('connection', (ws: WebSocket) => {
    const clientId = handleConnection(ws);

    ws.on('message', async (data: Buffer) => {
      try {
        await handleMessage(ws, data.toString());
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', async () => {
      try {
        await handleDisconnection(ws);
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Start HTTP server (WebSocket server is attached to it)
  httpServer.listen(PORT, () => {
    console.log(`BoardSesh Daemon is running on port ${PORT}`);
    console.log(`  WebSocket: ws://0.0.0.0:${PORT}`);
    console.log(`  Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`  Join session: http://0.0.0.0:${PORT}/join`);
  });

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error);
  });

  return { wss, httpServer };
}
