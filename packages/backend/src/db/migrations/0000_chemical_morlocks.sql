CREATE TABLE "session_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"username" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_queues" (
	"session_id" text PRIMARY KEY NOT NULL,
	"queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_climb_queue_item" jsonb DEFAULT 'null'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_clients" ADD CONSTRAINT "session_clients_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queues" ADD CONSTRAINT "session_queues_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;