import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import path from 'path';

// Load .env.development.local for local dev
config({ path: path.resolve(process.cwd(), '.env.development.local') });

// Use pg driver for local development, @vercel/postgres for production
const isDevelopment = process.env.VERCEL_ENV === 'development';

export default defineConfig({
  out: './drizzle',
  schema: './app/lib/db/schema.ts',
  dialect: 'postgresql',
  driver: isDevelopment ? 'pg' : '@vercel/postgres',
  dbCredentials: isDevelopment
    ? {
        host: process.env.POSTGRES_HOST || 'localhost',
        database: process.env.POSTGRES_DATABASE || 'verceldb',
        port: Number(process.env.POSTGRES_PORT || 54320),
        user: process.env.POSTGRES_USER || 'default',
        password: process.env.POSTGRES_PASSWORD || 'password',
        ssl: false,
      }
    : {
        connectionString: process.env.POSTGRES_URL,
      },
});
