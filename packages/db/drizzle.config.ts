import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import path from 'path';

// Load environment from root or web package
config({ path: path.resolve(process.cwd(), '../../.env.local') });
config({ path: path.resolve(process.cwd(), '../web/.env.local') });

export default defineConfig({
  out: './drizzle',
  schema: './src/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT!),
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DATABASE!,
    ssl: process.env.VERCEL_ENV === 'production' || process.env.IS_CI === 'true',
  },
});
