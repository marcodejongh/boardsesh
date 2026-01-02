ALTER TABLE "playlist_climbs" ALTER COLUMN "angle" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ALTER COLUMN "layout_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_type" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_id" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_synced_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "boardsesh_ticks_aurora_id_unique" ON "boardsesh_ticks" USING btree ("aurora_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_aurora_id_idx" ON "playlists" USING btree ("aurora_id");--> statement-breakpoint
-- Reset circuits sync timestamp to force re-sync and populate playlists table
UPDATE "kilter_user_syncs" SET "last_synchronized_at" = '2010-01-01 00:00:00.000000' WHERE "table_name" = 'circuits';--> statement-breakpoint
UPDATE "tension_user_syncs" SET "last_synchronized_at" = '2010-01-01 00:00:00.000000' WHERE "table_name" = 'circuits';