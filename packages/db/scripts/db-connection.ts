import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import ws from 'ws';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment files (same as migrate.ts)
config({ path: path.resolve(__dirname, '../../../.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.development.local') });

// Enable WebSocket for Neon
neonConfig.webSocketConstructor = ws;

/**
 * Resolve the database URL from environment variables.
 * Checks DATABASE_URL first, then POSTGRES_URL.
 */
export function getScriptDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL or POSTGRES_URL is not set');
    process.exit(1);
  }

  // Safety: Block local dev URLs in production builds
  const isLocalUrl = databaseUrl.includes('localhost') ||
                     databaseUrl.includes('localtest.me') ||
                     databaseUrl.includes('127.0.0.1');

  if (process.env.VERCEL && isLocalUrl) {
    console.error('Refusing to run with local DATABASE_URL in Vercel build');
    process.exit(1);
  }

  return databaseUrl;
}

/**
 * Configure Neon for local development (uses neon-proxy on port 4444).
 */
function configureNeonForLocal(connectionString: string): void {
  const connectionStringUrl = new URL(connectionString);
  const isLocalDb = connectionStringUrl.hostname === 'db.localtest.me';

  if (isLocalDb) {
    neonConfig.fetchEndpoint = (host) => {
      const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
      return `${protocol}://${host}:${port}/sql`;
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
  }
}

type ScriptDb = ReturnType<typeof drizzleServerless> | ReturnType<typeof drizzlePostgres>;

/**
 * Create a database connection suitable for scripts.
 *
 * - localhost / 127.0.0.1: uses postgres-js (direct TCP, no Neon proxy needed)
 * - db.localtest.me: uses Neon serverless with local proxy config
 * - Otherwise: uses Neon serverless (production)
 */
export function createScriptDb(url?: string): { db: ScriptDb; close: () => Promise<void> } {
  const databaseUrl = url ?? getScriptDatabaseUrl();
  const hostname = new URL(databaseUrl).hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Direct TCP connection via postgres-js (works during Docker build)
    const client = postgres(databaseUrl);
    const db = drizzlePostgres(client);
    return {
      db,
      close: async () => { await client.end(); },
    };
  }

  // Neon serverless (local proxy or production)
  configureNeonForLocal(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzleServerless(pool);
  return {
    db,
    close: async () => { await pool.end(); },
  };
}
