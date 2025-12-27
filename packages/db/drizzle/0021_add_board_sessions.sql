-- Add board_sessions tables for party mode functionality
-- Table renamed from 'sessions' to 'board_sessions' to avoid conflict with NextAuth sessions table

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
ALTER TABLE "board_session_clients" ADD CONSTRAINT "board_session_clients_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_session_queues" ADD CONSTRAINT "board_session_queues_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_sessions" ADD CONSTRAINT "board_sessions_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "board_sessions_location_idx" ON "board_sessions" ("latitude", "longitude");
--> statement-breakpoint
CREATE INDEX "board_sessions_discoverable_idx" ON "board_sessions" ("discoverable");
--> statement-breakpoint
CREATE INDEX "board_sessions_user_idx" ON "board_sessions" ("created_by_user_id");
