-- Add status column and indexes to board_sessions table
-- Session lifecycle status: 'active' (users connected), 'inactive' (no users, in Redis), 'ended' (explicitly closed)

ALTER TABLE "board_sessions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
CREATE INDEX "board_sessions_status_idx" ON "board_sessions" ("status");
--> statement-breakpoint
CREATE INDEX "board_sessions_last_activity_idx" ON "board_sessions" ("last_activity");
--> statement-breakpoint
CREATE INDEX "board_sessions_discovery_idx" ON "board_sessions" ("discoverable", "status", "last_activity");
