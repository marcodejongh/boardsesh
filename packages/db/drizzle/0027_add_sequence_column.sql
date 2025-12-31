-- Add sequence column for delta sync tracking
-- This column tracks the event sequence independently of the optimistic locking version
ALTER TABLE "board_session_queues" ADD COLUMN "sequence" integer DEFAULT 0 NOT NULL;
