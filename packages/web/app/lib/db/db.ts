import 'server-only';
import { neon } from '@neondatabase/serverless';

// Re-export from @boardsesh/db with server-only protection
export { createDb as getDb, createPool as getPool, createNeonHttp } from '@boardsesh/db/client';
export { configureNeonForEnvironment, getConnectionConfig } from '@boardsesh/db/client';

// Configure and export the raw SQL template literal function
import { configureNeonForEnvironment, getConnectionConfig } from '@boardsesh/db/client';

// Configure Neon for the environment
configureNeonForEnvironment();
const { connectionString } = getConnectionConfig();

// Export the neon SQL template literal function for raw SQL queries
export const sql = neon(connectionString);

// For backward compatibility (some code may use dbz)
import { createNeonHttp } from '@boardsesh/db/client';
export const dbz = createNeonHttp();
