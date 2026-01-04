import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment files (same as drizzle.config.ts)
config({ path: path.resolve(__dirname, '../../../.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.development.local') });

// Enable WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Configure Neon for local development (uses neon-proxy on port 4444)
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

async function runMigrations() {
  // Check for DATABASE_URL first, then POSTGRES_URL (Vercel Neon integration)
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  // Validation: A database URL must be set
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or POSTGRES_URL is not set');
    console.error('   Available env vars:', Object.keys(process.env).filter(k =>
      k.includes('DATABASE') || k.includes('POSTGRES')
    ).join(', ') || 'none');
    process.exit(1);
  }

  // Safety: Block local dev URLs in production builds
  const isLocalUrl = databaseUrl.includes('localhost') ||
                     databaseUrl.includes('localtest.me') ||
                     databaseUrl.includes('127.0.0.1');

  if (process.env.VERCEL && isLocalUrl) {
    console.error('❌ Refusing to run migrations with local DATABASE_URL in Vercel build');
    console.error('   Set DATABASE_URL in Vercel project environment variables');
    process.exit(1);
  }

  // Log target database (masked for security)
  const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
  console.log(`🔄 Running migrations on: ${dbHost}`);

  try {
    // Configure Neon for local proxy if using local database
    configureNeonForLocal(databaseUrl);

    const pool = new Pool({ connectionString: databaseUrl });

    // Add query logging for visibility in CI
    const db = drizzle(pool, {
      logger: {
        logQuery: (query: string) => {
          // Log first 200 chars of each query for progress visibility
          const preview = query.slice(0, 200).replace(/\s+/g, ' ').trim();
          const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
          console.log(`[${timestamp}] ${preview}${query.length > 200 ? '...' : ''}`);
        },
      },
    });

    // List pending migrations
    const migrationsFolder = path.resolve(__dirname, '../drizzle');
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    console.log(`📋 Found ${journal.entries.length} migrations in journal`);

    await migrate(db, { migrationsFolder });

    console.log('✅ Migrations completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
