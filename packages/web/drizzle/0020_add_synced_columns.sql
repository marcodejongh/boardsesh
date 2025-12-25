-- Add synced columns to ascent and climb tables for tracking Aurora sync status
-- Default to true for existing data (assumed to be synced from Aurora)

-- Kilter ascents
ALTER TABLE "kilter_ascents" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "kilter_ascents" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Tension ascents
ALTER TABLE "tension_ascents" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "tension_ascents" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Kilter bids
ALTER TABLE "kilter_bids" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "kilter_bids" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Tension bids
ALTER TABLE "tension_bids" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "tension_bids" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Kilter climbs
ALTER TABLE "kilter_climbs" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "kilter_climbs" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Tension climbs
ALTER TABLE "tension_climbs" ADD COLUMN IF NOT EXISTS "synced" boolean DEFAULT true NOT NULL;
ALTER TABLE "tension_climbs" ADD COLUMN IF NOT EXISTS "sync_error" text;
--> statement-breakpoint

-- Create indexes for efficient lookup of unsynced items
CREATE INDEX IF NOT EXISTS "kilter_ascents_synced_idx" ON "kilter_ascents" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_ascents_synced_idx" ON "tension_ascents" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "kilter_bids_synced_idx" ON "kilter_bids" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_bids_synced_idx" ON "tension_bids" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "kilter_climbs_synced_idx" ON "kilter_climbs" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_climbs_synced_idx" ON "tension_climbs" ("synced") WHERE "synced" = false;
