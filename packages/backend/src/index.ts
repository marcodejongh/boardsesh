import 'dotenv/config';
import { startServer } from './server';
import { redisClientManager } from './redis/client';

async function main() {
  // Start the server (initializes PubSub/Redis)
  const { wss, httpServer } = await startServer();

  // Handle graceful shutdown
  async function shutdown() {
    console.log('\nShutting down Boardsesh Daemon...');

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
    });

    // Disconnect from Redis
    await redisClientManager.disconnect();

    // Give connections time to close gracefully
    setTimeout(() => {
      console.log('Shutdown complete');
      process.exit(0);
    }, 1000);

    // Force exit after 5 seconds if connections don't close gracefully
    setTimeout(() => {
      console.log('Forcing shutdown...');
      process.exit(0);
    }, 5000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
