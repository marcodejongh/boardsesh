-- Create social entity type enum
DO $$ BEGIN
  CREATE TYPE "social_entity_type" AS ENUM('playlist_climb', 'climb', 'tick', 'comment', 'proposal', 'board');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "uuid" text NOT NULL UNIQUE,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "entity_type" "social_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "parent_comment_id" bigint,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

-- Create votes table
CREATE TABLE IF NOT EXISTS "votes" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "entity_type" "social_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "value" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "vote_value_check" CHECK ("value" IN (1, -1))
);

-- Comments indexes
CREATE INDEX IF NOT EXISTS "comments_entity_created_at_idx" ON "comments" ("entity_type", "entity_id", "created_at");
CREATE INDEX IF NOT EXISTS "comments_user_created_at_idx" ON "comments" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "comments_parent_comment_idx" ON "comments" ("parent_comment_id");

-- Votes indexes
CREATE UNIQUE INDEX IF NOT EXISTS "votes_unique_user_entity" ON "votes" ("user_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "votes_entity_idx" ON "votes" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "votes_user_idx" ON "votes" ("user_id");

-- Self-referencing foreign key for comment threading
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "comments" ("id") ON DELETE SET NULL;
