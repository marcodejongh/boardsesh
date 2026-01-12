-- Add pull_direction column to user_hold_classifications
-- This migration is idempotent (safe to run multiple times)

-- Add pull_direction if it doesn't exist
ALTER TABLE "user_hold_classifications" ADD COLUMN IF NOT EXISTS "pull_direction" integer;
