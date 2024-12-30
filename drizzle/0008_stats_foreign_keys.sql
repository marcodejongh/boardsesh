ALTER TABLE IF EXISTS public.tension_climb_stats 
DROP CONSTRAINT IF EXISTS climb_stats_climb_uuid_fkey;
ALTER TABLE IF EXISTS public.kilter_climb_stats 
DROP CONSTRAINT IF EXISTS climb_stats_climb_uuid_fkey1;

ALTER TABLE IF EXISTS public.tension_climb_stats 
DROP CONSTRAINT IF EXISTS tension_climb_stats_climb_uuid_tension_climbs_uuid_fk;
ALTER TABLE IF EXISTS public.kilter_climb_stats 
DROP CONSTRAINT IF EXISTS kilter_climb_stats_climb_uuid_kilter_climbs_uuid_fk;

ALTER TABLE "kilter_climb_stats" 
ADD CONSTRAINT "kilter_climb_stats_climb_uuid_kilter_climbs_uuid_fk" 
FOREIGN KEY ("climb_uuid") 
REFERENCES "public"."kilter_climbs"("uuid") 
ON DELETE cascade 
ON UPDATE cascade 
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "tension_climb_stats" 
ADD CONSTRAINT "tension_climb_stats_climb_uuid_tension_climbs_uuid_fk" 
FOREIGN KEY ("climb_uuid") 
REFERENCES "public"."tension_climbs"("uuid") 
ON DELETE cascade 
ON UPDATE cascade 
DEFERRABLE INITIALLY DEFERRED;
