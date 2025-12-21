import { startServer } from './server.js';
import { roomManager } from './services/room-manager.js';

// Start the server
const { wss, httpServer } = startServer();

// Start session cleanup interval
roomManager.startCleanupInterval();

// Handle graceful shutdown
function shutdown() {
  console.log('\nShutting down BoardSesh Daemon...');

  // Stop session cleanup interval
  roomManager.stopCleanupInterval();

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
