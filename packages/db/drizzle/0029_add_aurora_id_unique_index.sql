-- Add unique index on aurora_id for boardsesh_ticks table
-- This index only covers non-null values, allowing multiple NULL aurora_ids
-- (for local-only ticks not yet synced to Aurora)
CREATE UNIQUE INDEX IF NOT EXISTS "boardsesh_ticks_aurora_id_unique" ON "boardsesh_ticks" ("aurora_id") WHERE "aurora_id" IS NOT NULL;
