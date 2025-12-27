-- Add GPS coordinates for session discovery
ALTER TABLE "sessions" ADD COLUMN "latitude" double precision;
ALTER TABLE "sessions" ADD COLUMN "longitude" double precision;

-- Add discoverable flag
ALTER TABLE "sessions" ADD COLUMN "discoverable" boolean DEFAULT false NOT NULL;

-- Add creator user reference
ALTER TABLE "sessions" ADD COLUMN "created_by_user_id" text;

-- Add session name
ALTER TABLE "sessions" ADD COLUMN "name" text;

-- Add expiry timestamp
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp;

-- Create indexes for efficient queries
CREATE INDEX "sessions_location_idx" ON "sessions" ("latitude", "longitude");
CREATE INDEX "sessions_discoverable_idx" ON "sessions" ("discoverable", "expires_at");
CREATE INDEX "sessions_user_idx" ON "sessions" ("created_by_user_id");
