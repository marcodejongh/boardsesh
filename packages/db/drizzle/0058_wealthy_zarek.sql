ALTER TYPE "public"."social_entity_type" ADD VALUE 'session';--> statement-breakpoint
CREATE TABLE "inferred_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_tick_at" timestamp NOT NULL,
	"last_tick_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"total_sends" integer DEFAULT 0 NOT NULL,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"total_flashes" integer DEFAULT 0 NOT NULL,
	"tick_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD COLUMN "inferred_session_id" text;--> statement-breakpoint
ALTER TABLE "inferred_sessions" ADD CONSTRAINT "inferred_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inferred_sessions_user_idx" ON "inferred_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inferred_sessions_user_last_tick_idx" ON "inferred_sessions" USING btree ("user_id","last_tick_at");--> statement-breakpoint
CREATE INDEX "inferred_sessions_last_tick_idx" ON "inferred_sessions" USING btree ("last_tick_at");--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_inferred_session_id_inferred_sessions_id_fk" FOREIGN KEY ("inferred_session_id") REFERENCES "public"."inferred_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP INDEX IF EXISTS "board_climbs_setter_username_idx";--> statement-breakpoint
CREATE INDEX "board_climbs_setter_username_idx" ON "board_climbs" USING btree ("board_type","setter_username");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_inferred_session_idx" ON "boardsesh_ticks" USING btree ("inferred_session_id");