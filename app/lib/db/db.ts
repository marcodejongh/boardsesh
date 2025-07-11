import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import 'server-only';
import ws from 'ws';

let connectionString = process.env.DATABASE_URL;

// Configuring Neon for local development
if (process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV === 'development') {
  connectionString = 'postgres://postgres:password@localhost:5432/main';
  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };
  const connectionStringUrl = new URL(connectionString);
  neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'localhost';
  neonConfig.wsProxy = (host) => (host === 'localhost' ? `${host}:4444/v2` : `${host}/v2`);
}

// Only configure WebSocket constructor in development or when not building

export const pool = new Pool({ connectionString });

// WebSocket Client:
// - Best for long-running applications (like servers)
// - Maintains a persistent connection
// - More efficient for multiple sequential queries
// - Better for high-frequency database operations
export const dbz = drizzleWs({ client: pool });
neonConfig.webSocketConstructor = ws;