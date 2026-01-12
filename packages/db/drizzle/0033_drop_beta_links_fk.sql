-- Drop the foreign key constraint on board_beta_links
-- Beta links may arrive before their corresponding climbs during sync from Aurora API
ALTER TABLE "board_beta_links" DROP CONSTRAINT IF EXISTS "board_beta_links_climb_fk";
