import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import 'server-only';
import ws from 'ws';

let connectionString = process.env.DATABASE_URL;

// Configuring Neon for local development
if (process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV === 'development') {
  connectionString = 'postgres://postgres:password@db.localtest.me:5432/main';

  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };
  const connectionStringUrl = new URL(connectionString);
  neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
  neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
}

// Configure WebSocket constructor
neonConfig.webSocketConstructor = ws;

// Create a singleton pool instance
let pool: Pool | null = null;

export const getPool = () => {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
};

// Create a singleton db instance
let db: ReturnType<typeof drizzleServerless> | null = null;

export const getDb = () => {
  if (!db) {
    const pool = getPool();
    db = drizzleServerless(pool);
  }
  return db;
};

export const sql = neon(connectionString!);

export const dbz = drizzleHttp({ client: sql });
