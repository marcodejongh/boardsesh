-- Drop the foreign key constraint on board_climb_stats
-- Stats may arrive before their corresponding climbs during sync from Aurora API
ALTER TABLE "board_climb_stats" DROP CONSTRAINT IF EXISTS "board_climb_stats_climb_fk";
