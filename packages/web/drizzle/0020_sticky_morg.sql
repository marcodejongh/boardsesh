CREATE TYPE "public"."aurora_table_type" AS ENUM('ascents', 'bids');--> statement-breakpoint
CREATE TYPE "public"."tick_status" AS ENUM('flash', 'send', 'attempt');--> statement-breakpoint
CREATE TABLE "aurora_credentials" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"encrypted_username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"aurora_user_id" integer,
	"aurora_token" text,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_session_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"username" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_session_queues" (
	"session_id" text PRIMARY KEY NOT NULL,
	"queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_climb_queue_item" jsonb DEFAULT 'null'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"board_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"discoverable" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "boardsesh_ticks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"is_mirror" boolean DEFAULT false,
	"status" "tick_status" NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"quality" integer,
	"difficulty" integer,
	"is_benchmark" boolean DEFAULT false,
	"comment" text DEFAULT '',
	"climbed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"session_id" text,
	"aurora_type" "aurora_table_type",
	"aurora_id" text,
	"aurora_synced_at" timestamp,
	"aurora_sync_error" text,
	CONSTRAINT "boardsesh_ticks_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "kilter_bids" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kilter_bids" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "kilter_climbs" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "kilter_climbs" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "tension_bids" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tension_bids" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "tension_climbs" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tension_climbs" ADD COLUMN "sync_error" text;--> statement-breakpoint
ALTER TABLE "aurora_credentials" ADD CONSTRAINT "aurora_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_session_clients" ADD CONSTRAINT "board_session_clients_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_session_queues" ADD CONSTRAINT "board_session_queues_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD CONSTRAINT "board_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_board_credential" ON "aurora_credentials" USING btree ("user_id","board_type");--> statement-breakpoint
CREATE INDEX "aurora_credentials_user_idx" ON "aurora_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "board_sessions_location_idx" ON "board_sessions" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "board_sessions_discoverable_idx" ON "board_sessions" USING btree ("discoverable");--> statement-breakpoint
CREATE INDEX "board_sessions_user_idx" ON "board_sessions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_user_board_idx" ON "boardsesh_ticks" USING btree ("user_id","board_type");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_climb_idx" ON "boardsesh_ticks" USING btree ("climb_uuid","board_type");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_sync_pending_idx" ON "boardsesh_ticks" USING btree ("aurora_id","user_id");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_session_idx" ON "boardsesh_ticks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "boardsesh_ticks_climbed_at_idx" ON "boardsesh_ticks" USING btree ("climbed_at");