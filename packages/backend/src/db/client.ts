// Re-export db client from @boardsesh/db
import { createDb } from '@boardsesh/db/client';

// Create singleton db instance for backend
export const db = createDb();

export type Database = typeof db;
