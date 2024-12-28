CREATE TABLE "kilter_climb_stats_history" (
   "id" bigserial PRIMARY KEY NOT NULL,
   "climb_uuid" text NOT NULL,
   "angle" bigint NOT NULL,
   "display_difficulty" double precision,
   "benchmark_difficulty" double precision,
   "ascensionist_count" bigint,
   "difficulty_average" double precision,
   "quality_average" double precision,
   "fa_username" text,
   "fa_at" timestamp,
   "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tension_climb_stats_history" (
   "id" bigserial PRIMARY KEY NOT NULL,
   "climb_uuid" text NOT NULL,
   "angle" bigint NOT NULL,
   "display_difficulty" double precision,
   "benchmark_difficulty" double precision,
   "ascensionist_count" bigint,
   "difficulty_average" double precision,
   "quality_average" double precision,
   "fa_username" text,
   "fa_at" timestamp,
   "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tension_climb_stats" ALTER COLUMN "angle" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "kilter_climb_stats" ALTER COLUMN "climb_uuid" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "kilter_climb_stats" ALTER COLUMN "angle" SET NOT NULL;
--> statement-breakpoint

-- Copy existing records into history tables
INSERT INTO tension_climb_stats_history (
 climb_uuid, angle, display_difficulty, benchmark_difficulty,
 ascensionist_count, difficulty_average, quality_average,
 fa_username, fa_at
)
SELECT 
 climb_uuid, angle, display_difficulty, benchmark_difficulty,
 ascensionist_count, difficulty_average, quality_average,
 fa_username, fa_at
FROM tension_climb_stats;
--> statement-breakpoint

INSERT INTO kilter_climb_stats_history (
 climb_uuid, angle, display_difficulty, benchmark_difficulty,
 ascensionist_count, difficulty_average, quality_average,
 fa_username, fa_at
)
SELECT 
 climb_uuid, angle, display_difficulty, benchmark_difficulty,
 ascensionist_count, difficulty_average, quality_average,
 fa_username, fa_at
FROM kilter_climb_stats;
--> statement-breakpoint

-- Deduplicate existing climb_stats by keeping highest id
DELETE FROM tension_climb_stats a USING (
 SELECT climb_uuid, angle, MAX(id) as max_id
 FROM tension_climb_stats
 GROUP BY climb_uuid, angle
) b 
WHERE a.climb_uuid = b.climb_uuid 
AND a.angle = b.angle 
AND a.id < b.max_id;
--> statement-breakpoint

DELETE FROM kilter_climb_stats a USING (
 SELECT climb_uuid, angle, MAX(id) as max_id
 FROM kilter_climb_stats
 GROUP BY climb_uuid, angle
) b 
WHERE a.climb_uuid = b.climb_uuid 
AND a.angle = b.angle 
AND a.id < b.max_id;
--> statement-breakpoint

-- Add unique constraints
CREATE UNIQUE INDEX "tension_climb_angle_idx" ON "tension_climb_stats" USING btree ("climb_uuid","angle");
--> statement-breakpoint
CREATE UNIQUE INDEX "kilter_climb_angle_idx" ON "kilter_climb_stats" USING btree ("climb_uuid","angle");