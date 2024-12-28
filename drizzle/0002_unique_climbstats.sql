DROP INDEX IF EXISTS "kilter_climb_angle_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16791_sqlite_autoindex_holes_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16791_sqlite_autoindex_holes_3";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16797_sqlite_autoindex_leds_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16904_sqlite_autoindex_placements_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16813_sqlite_autoindex_product_sizes_layouts_sets_2";--> statement-breakpoint
DROP INDEX IF EXISTS "tension_climb_angle_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16405_sqlite_autoindex_holes_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16405_sqlite_autoindex_holes_3";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16411_sqlite_autoindex_leds_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16518_sqlite_autoindex_placements_2";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_16427_sqlite_autoindex_product_sizes_layouts_sets_2";--> statement-breakpoint
ALTER TABLE "kilter_beta_links" DROP CONSTRAINT "idx_16883_sqlite_autoindex_beta_links_1";--> statement-breakpoint
ALTER TABLE "kilter_circuits_climbs" DROP CONSTRAINT "idx_16868_sqlite_autoindex_circuits_climbs_1";--> statement-breakpoint
ALTER TABLE "kilter_products_angles" DROP CONSTRAINT "idx_16800_sqlite_autoindex_products_angles_1";--> statement-breakpoint
ALTER TABLE "kilter_tags" DROP CONSTRAINT "idx_16853_sqlite_autoindex_tags_1";--> statement-breakpoint
ALTER TABLE "kilter_user_permissions" DROP CONSTRAINT "idx_16828_sqlite_autoindex_user_permissions_1";--> statement-breakpoint
ALTER TABLE "kilter_user_syncs" DROP CONSTRAINT "idx_16833_sqlite_autoindex_user_syncs_1";--> statement-breakpoint
ALTER TABLE "kilter_walls_sets" DROP CONSTRAINT "idx_16838_sqlite_autoindex_walls_sets_1";--> statement-breakpoint
ALTER TABLE "tension_beta_links" DROP CONSTRAINT "idx_16497_sqlite_autoindex_beta_links_1";--> statement-breakpoint
ALTER TABLE "tension_circuits_climbs" DROP CONSTRAINT "idx_16482_sqlite_autoindex_circuits_climbs_1";--> statement-breakpoint
ALTER TABLE "tension_products_angles" DROP CONSTRAINT "idx_16414_sqlite_autoindex_products_angles_1";--> statement-breakpoint
ALTER TABLE "tension_tags" DROP CONSTRAINT "idx_16472_sqlite_autoindex_tags_1";--> statement-breakpoint
ALTER TABLE "tension_user_permissions" DROP CONSTRAINT "idx_16447_sqlite_autoindex_user_permissions_1";--> statement-breakpoint
ALTER TABLE "tension_user_syncs" DROP CONSTRAINT "idx_16452_sqlite_autoindex_user_syncs_1";--> statement-breakpoint
ALTER TABLE "tension_walls_sets" DROP CONSTRAINT "idx_16457_sqlite_autoindex_walls_sets_1";--> statement-breakpoint
-- Drop the existing primary key constraints
ALTER TABLE tension_climb_stats DROP CONSTRAINT IF EXISTS idx_33308_climb_stats_pkey;
ALTER TABLE kilter_climb_stats DROP CONSTRAINT IF EXISTS idx_32922_climb_stats_pkey;

ALTER TABLE tension_climb_stats DROP COLUMN IF EXISTS id;
ALTER TABLE kilter_climb_stats DROP COLUMN IF EXISTS id;
ALTER TABLE "kilter_climb_stats" ADD CONSTRAINT "kilter_climb_stats_pk" PRIMARY KEY("climb_uuid","angle");--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ADD CONSTRAINT "tension_climb_stats_pk" PRIMARY KEY("climb_uuid","angle");--> statement-breakpoint