ALTER TABLE "playlists" ADD COLUMN "last_accessed_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlists_last_accessed_at_idx" ON "playlists" USING btree ("last_accessed_at");
