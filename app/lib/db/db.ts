import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import 'server-only'
import ws from 'ws';

let connectionString = process.env.DATABASE_URL;

// // Configuring Neon for local development
// if (process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV === 'development') {
//   connectionString = 'postgres://postgres:password@localhost:5432/main';
//   console.log(connectionString);
//   neonConfig.fetchEndpoint = (host) => {
//     const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
//     return `${protocol}://${host}:${port}/sql`;
//   };
//   const connectionStringUrl = new URL(connectionString);
//   neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'localhost';
//   neonConfig.wsProxy = (host) => (host === 'localhost' ? `${host}:4444/v2` : `${host}/v2`);
// }

// Only configure WebSocket constructor in development or when not building
export const getPool = () => {
  neonConfig.webSocketConstructor = ws;

  if (process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV === 'development') {
    return new Pool({ connectionString: 'postgres://postgres:password@localhost:5432/main' });
  }

  return new Pool({ connectionString });
}

export const sql = neon(connectionString!);

export const dbz = drizzleHttp({ client: sql });
