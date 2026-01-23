-- Add holds_hash column to board_climbs table for duplicate detection
ALTER TABLE "board_climbs" ADD COLUMN "holds_hash" text;--> statement-breakpoint
-- Create index for efficient duplicate lookups by board type, layout, and holds hash
CREATE INDEX IF NOT EXISTS "board_climbs_holds_hash_idx" ON "board_climbs" ("board_type","layout_id","holds_hash");
