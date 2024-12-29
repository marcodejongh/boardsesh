import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/vercel-postgres';

if (process.env.VERCEL_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export * from '@vercel/postgres';

export const dbz = drizzle({
  logger: process.env.VERCEL_ENV === 'development',
});
