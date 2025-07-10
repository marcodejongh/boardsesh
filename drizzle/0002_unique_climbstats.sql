DROP INDEX IF EXISTS "kilter_climb_angle_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tension_climb_angle_idx";--> statement-breakpoint
-- Drop the existing primary key constraints
ALTER TABLE tension_climb_stats DROP CONSTRAINT IF EXISTS idx_33308_climb_stats_pkey;
ALTER TABLE kilter_climb_stats DROP CONSTRAINT IF EXISTS idx_32922_climb_stats_pkey;

ALTER TABLE tension_climb_stats DROP COLUMN IF EXISTS id;
ALTER TABLE kilter_climb_stats DROP COLUMN IF EXISTS id;
ALTER TABLE "kilter_climb_stats" ADD CONSTRAINT "kilter_climb_stats_pk" PRIMARY KEY("climb_uuid","angle");--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ADD CONSTRAINT "tension_climb_stats_pk" PRIMARY KEY("climb_uuid","angle");--> statement-breakpoint