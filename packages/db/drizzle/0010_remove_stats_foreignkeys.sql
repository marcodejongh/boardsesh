--> statement-breakpoint
ALTER TABLE "kilter_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;

ALTER TABLE IF EXISTS public.tension_climb_stats 
DROP CONSTRAINT IF EXISTS climb_stats_climb_uuid_fkey;
ALTER TABLE IF EXISTS public.kilter_climb_stats 
DROP CONSTRAINT IF EXISTS climb_stats_climb_uuid_fkey1;

ALTER TABLE IF EXISTS public.tension_climb_stats 
DROP CONSTRAINT IF EXISTS tension_climb_stats_climb_uuid_tension_climbs_uuid_fk;
ALTER TABLE IF EXISTS public.kilter_climb_stats 
DROP CONSTRAINT IF EXISTS kilter_climb_stats_climb_uuid_kilter_climbs_uuid_fk;