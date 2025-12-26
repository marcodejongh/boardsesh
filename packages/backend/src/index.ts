import 'dotenv/config';
import { startServer } from './server.js';
import { sessionCleanupService } from './services/session-cleanup.js';

// Start the server
const { wss, httpServer } = startServer();

// Start session cleanup service (runs every hour)
sessionCleanupService.start();

// Handle graceful shutdown
function shutdown() {
  console.log('\nShutting down Boardsesh Daemon...');

  // Stop session cleanup service
  sessionCleanupService.stop();

  // Close WebSocket server (stops accepting new connections)
  wss.close(() => {
    console.log('WebSocket server closed');
  });

  // Close all existing WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });

  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds if connections don't close gracefully
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(0);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
