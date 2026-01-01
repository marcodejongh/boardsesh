import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment files (same as drizzle.config.ts)
config({ path: path.resolve(__dirname, '../../../.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.development.local') });

// Enable WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  // Validation: DATABASE_URL must be set
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
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
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);

    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });

    console.log('✅ Migrations completed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
