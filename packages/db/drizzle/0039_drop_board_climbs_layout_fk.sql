-- Drop the foreign key constraint on board_climbs.layout_id
-- This allows draft climbs to be synced even when their layout doesn't exist yet
ALTER TABLE "board_climbs" DROP CONSTRAINT IF EXISTS "board_climbs_layout_fk";
