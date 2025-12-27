import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { getConnectionConfig, configureNeonForEnvironment } from './config.js';
import * as schema from '../schema/index.js';
import * as relations from '../relations/index.js';

// Configure WebSocket constructor
neonConfig.webSocketConstructor = ws;

// Combine schema and relations for full Drizzle support
const fullSchema = { ...schema, ...relations };

// Singleton instances
let pool: Pool | null = null;
let db: ReturnType<typeof drizzleServerless> | null = null;

export function createPool(): Pool {
  if (!pool) {
    configureNeonForEnvironment();
    const { connectionString } = getConnectionConfig();
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function createDb() {
  if (!db) {
    const poolInstance = createPool();
    db = drizzleServerless(poolInstance, { schema: fullSchema });
  }
  return db;
}

export function createNeonHttp() {
  configureNeonForEnvironment();
  const { connectionString } = getConnectionConfig();
  const sql = neon(connectionString);
  return drizzleHttp({ client: sql, schema: fullSchema });
}

export type DbInstance = ReturnType<typeof createDb>;
export type PoolInstance = Pool;
