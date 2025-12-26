-- Remove session expiry column and update index
-- Sessions will no longer expire automatically

-- Drop the existing index that includes expires_at
DROP INDEX IF EXISTS "sessions_discoverable_idx";

-- Recreate index without expires_at
CREATE INDEX "sessions_discoverable_idx" ON "sessions" ("discoverable");

-- Drop the expires_at column
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "expires_at";
