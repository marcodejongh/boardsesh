ALTER TYPE "public"."feed_item_type" ADD VALUE 'session_summary';--> statement-breakpoint
CREATE TABLE "session_boards" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"board_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "is_permanent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "board_sessions" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "session_boards" ADD CONSTRAINT "session_boards_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_boards" ADD CONSTRAINT "session_boards_board_id_user_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."user_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_boards_session_board_idx" ON "session_boards" USING btree ("session_id","board_id");--> statement-breakpoint
CREATE INDEX "session_boards_session_idx" ON "session_boards" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_boards_board_idx" ON "session_boards" USING btree ("board_id");