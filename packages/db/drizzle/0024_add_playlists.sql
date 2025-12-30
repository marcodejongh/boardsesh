CREATE TABLE "playlists" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"board_type" text NOT NULL,
	"layout_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlists_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "playlist_climbs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"playlist_id" bigint NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_ownership" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"playlist_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_climbs" ADD CONSTRAINT "playlist_climbs_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_ownership" ADD CONSTRAINT "playlist_ownership_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_ownership" ADD CONSTRAINT "playlist_ownership_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_playlist_climb" ON "playlist_climbs" USING btree ("playlist_id","climb_uuid");--> statement-breakpoint
CREATE INDEX "playlist_climbs_climb_idx" ON "playlist_climbs" USING btree ("climb_uuid");--> statement-breakpoint
CREATE INDEX "playlist_climbs_position_idx" ON "playlist_climbs" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_playlist_ownership" ON "playlist_ownership" USING btree ("playlist_id","user_id");--> statement-breakpoint
CREATE INDEX "playlist_ownership_user_idx" ON "playlist_ownership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playlists_board_layout_idx" ON "playlists" USING btree ("board_type","layout_id");--> statement-breakpoint
CREATE INDEX "playlists_uuid_idx" ON "playlists" USING btree ("uuid");
