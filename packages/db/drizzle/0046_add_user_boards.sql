-- User boards table
CREATE TABLE IF NOT EXISTS "user_boards" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "uuid" text NOT NULL UNIQUE,
  "slug" text NOT NULL,
  "owner_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "board_type" text NOT NULL,
  "layout_id" bigint NOT NULL,
  "size_id" bigint NOT NULL,
  "set_ids" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "location_name" text,
  "latitude" double precision,
  "longitude" double precision,
  "is_public" boolean NOT NULL DEFAULT true,
  "is_owned" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- Board follows table
CREATE TABLE IF NOT EXISTS "board_follows" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "board_uuid" text NOT NULL REFERENCES "user_boards" ("uuid") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add board_id to boardsesh_ticks
ALTER TABLE "boardsesh_ticks" ADD COLUMN IF NOT EXISTS "board_id" bigint REFERENCES "user_boards" ("id") ON DELETE SET NULL;

-- Add board_id to board_sessions
ALTER TABLE "board_sessions" ADD COLUMN IF NOT EXISTS "board_id" bigint REFERENCES "user_boards" ("id") ON DELETE SET NULL;

-- user_boards indexes
CREATE UNIQUE INDEX IF NOT EXISTS "user_boards_unique_owner_config" ON "user_boards" ("owner_id", "board_type", "layout_id", "size_id", "set_ids") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "user_boards_owner_owned_idx" ON "user_boards" ("owner_id", "is_owned") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "user_boards_public_idx" ON "user_boards" ("board_type", "layout_id", "is_public") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_boards_unique_slug" ON "user_boards" ("slug") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "user_boards_uuid_idx" ON "user_boards" ("uuid");

-- board_follows indexes
CREATE UNIQUE INDEX IF NOT EXISTS "board_follows_unique_user_board" ON "board_follows" ("user_id", "board_uuid");
CREATE INDEX IF NOT EXISTS "board_follows_user_idx" ON "board_follows" ("user_id");
CREATE INDEX IF NOT EXISTS "board_follows_board_uuid_idx" ON "board_follows" ("board_uuid");

-- boardsesh_ticks board indexes
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_board_climbed_at_idx" ON "boardsesh_ticks" ("board_id", "climbed_at");
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_board_user_idx" ON "boardsesh_ticks" ("board_id", "user_id");
