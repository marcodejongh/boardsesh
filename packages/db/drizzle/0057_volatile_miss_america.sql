ALTER TYPE "public"."notification_type" ADD VALUE 'new_climbs_synced';--> statement-breakpoint
CREATE TABLE "setter_follows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"setter_username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "setter_follows" ADD CONSTRAINT "setter_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_setter_follow" ON "setter_follows" USING btree ("follower_id","setter_username");--> statement-breakpoint
CREATE INDEX "setter_follows_follower_idx" ON "setter_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "setter_follows_setter_idx" ON "setter_follows" USING btree ("setter_username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_climbs_setter_username_idx" ON "board_climbs" ("setter_username") WHERE setter_username IS NOT NULL;