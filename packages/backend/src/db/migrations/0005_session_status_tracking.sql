-- Add session status tracking for hybrid Redis + Postgres persistence
-- Status values: 'active' (users connected), 'inactive' (no users, in Redis), 'ended' (explicitly closed)

ALTER TABLE "board_sessions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;

-- Add constraint to ensure valid status values
ALTER TABLE "board_sessions" ADD CONSTRAINT "board_sessions_status_check"
  CHECK (status IN ('active', 'inactive', 'ended'));

-- Add indexes for efficient status filtering and discovery queries
CREATE INDEX "board_sessions_status_idx" ON "board_sessions" ("status");
CREATE INDEX "board_sessions_last_activity_idx" ON "board_sessions" ("last_activity");

-- Composite index for discovery queries (discoverable + status + lastActivity)
CREATE INDEX "board_sessions_discovery_idx" ON "board_sessions" ("discoverable", "status", "last_activity");
