-- Add authorized_session_id column to esp32_controllers for session authorization
ALTER TABLE "esp32_controllers" ADD COLUMN IF NOT EXISTS "authorized_session_id" text;

-- Create index for authorized session lookups
CREATE INDEX IF NOT EXISTS "esp32_controllers_session_idx" ON "esp32_controllers" ("authorized_session_id");
