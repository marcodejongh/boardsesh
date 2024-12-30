ALTER TABLE "kilter_climb_stats" DROP CONSTRAINT "kilter_climb_stats_climb_uuid_kilter_climbs_uuid_fk";
--> statement-breakpoint
ALTER TABLE "tension_climb_stats" DROP CONSTRAINT "tension_climb_stats_climb_uuid_tension_climbs_uuid_fk";
--> statement-breakpoint
ALTER TABLE "kilter_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;