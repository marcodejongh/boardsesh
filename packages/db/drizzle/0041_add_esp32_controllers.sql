-- Add ESP32 controllers table for board controller registration
CREATE TABLE IF NOT EXISTS "esp32_controllers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "api_key" varchar(64) UNIQUE NOT NULL,
  "name" varchar(100),
  "board_name" varchar(20) NOT NULL,
  "layout_id" integer NOT NULL,
  "size_id" integer NOT NULL,
  "set_ids" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "esp32_controllers_user_idx" ON "esp32_controllers" ("user_id");
CREATE INDEX IF NOT EXISTS "esp32_controllers_api_key_idx" ON "esp32_controllers" ("api_key");
