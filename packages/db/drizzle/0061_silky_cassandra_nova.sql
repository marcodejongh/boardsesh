CREATE TABLE "playlist_follows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"playlist_uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_follows" ADD CONSTRAINT "playlist_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_playlist_follow" ON "playlist_follows" USING btree ("follower_id","playlist_uuid");--> statement-breakpoint
CREATE INDEX "playlist_follows_follower_idx" ON "playlist_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "playlist_follows_playlist_idx" ON "playlist_follows" USING btree ("playlist_uuid");