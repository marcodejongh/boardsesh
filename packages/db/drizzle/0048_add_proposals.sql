-- Community Proposals + Admin Roles (Milestone 6)

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."community_role_type" AS ENUM('admin', 'community_leader');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."proposal_type" AS ENUM('grade', 'classic', 'benchmark');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."proposal_status" AS ENUM('open', 'approved', 'rejected', 'superseded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- community_roles
CREATE TABLE IF NOT EXISTS "community_roles" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "community_role_type" NOT NULL,
  "board_type" text,
  "granted_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_roles_user_role_board_idx" ON "community_roles" USING btree ("user_id", "role", "board_type");
CREATE INDEX IF NOT EXISTS "community_roles_board_type_idx" ON "community_roles" USING btree ("board_type");

-- community_settings
CREATE TABLE IF NOT EXISTS "community_settings" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "scope" text NOT NULL,
  "scope_key" text NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "set_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_settings_scope_key_idx" ON "community_settings" USING btree ("scope", "scope_key", "key");

-- climb_proposals
CREATE TABLE IF NOT EXISTS "climb_proposals" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "uuid" text NOT NULL UNIQUE,
  "climb_uuid" text NOT NULL,
  "board_type" text NOT NULL,
  "angle" integer,
  "proposer_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "proposal_type" NOT NULL,
  "proposed_value" text NOT NULL,
  "current_value" text NOT NULL,
  "status" "proposal_status" NOT NULL DEFAULT 'open',
  "reason" text,
  "resolved_at" timestamp,
  "resolved_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "climb_proposals_climb_angle_type_idx" ON "climb_proposals" USING btree ("climb_uuid", "angle", "type");
CREATE INDEX IF NOT EXISTS "climb_proposals_status_idx" ON "climb_proposals" USING btree ("status");
CREATE INDEX IF NOT EXISTS "climb_proposals_proposer_idx" ON "climb_proposals" USING btree ("proposer_id");
CREATE INDEX IF NOT EXISTS "climb_proposals_board_type_idx" ON "climb_proposals" USING btree ("board_type");
CREATE INDEX IF NOT EXISTS "climb_proposals_created_at_idx" ON "climb_proposals" USING btree ("created_at");

-- proposal_votes
CREATE TABLE IF NOT EXISTS "proposal_votes" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "proposal_id" bigint NOT NULL REFERENCES "climb_proposals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "value" integer NOT NULL,
  "weight" integer NOT NULL DEFAULT 1,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "proposal_vote_value_check" CHECK ("value" IN (1, -1))
);

CREATE UNIQUE INDEX IF NOT EXISTS "proposal_votes_unique_user_proposal" ON "proposal_votes" USING btree ("proposal_id", "user_id");
CREATE INDEX IF NOT EXISTS "proposal_votes_proposal_idx" ON "proposal_votes" USING btree ("proposal_id");

-- climb_community_status
CREATE TABLE IF NOT EXISTS "climb_community_status" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "climb_uuid" text NOT NULL,
  "board_type" text NOT NULL,
  "angle" integer NOT NULL,
  "community_grade" text,
  "is_benchmark" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_proposal_id" bigint REFERENCES "climb_proposals"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "climb_community_status_unique_idx" ON "climb_community_status" USING btree ("climb_uuid", "board_type", "angle");

-- climb_classic_status
CREATE TABLE IF NOT EXISTS "climb_classic_status" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "climb_uuid" text NOT NULL,
  "board_type" text NOT NULL,
  "is_classic" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_proposal_id" bigint REFERENCES "climb_proposals"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "climb_classic_status_unique_idx" ON "climb_classic_status" USING btree ("climb_uuid", "board_type");
