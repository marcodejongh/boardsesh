-- Add unique index on aurora_id for boardsesh_ticks table
-- PostgreSQL unique indexes allow multiple NULLs by default, so local-only ticks
-- (without aurora_id) are not affected by this constraint
DROP INDEX IF EXISTS "boardsesh_ticks_aurora_id_unique";
CREATE UNIQUE INDEX "boardsesh_ticks_aurora_id_unique" ON "boardsesh_ticks" ("aurora_id");
