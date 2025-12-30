-- Fix migration: Add all missing tables and columns
-- This migration is idempotent and can be run safely on any state of the database

-- Create enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tick_status') THEN
        CREATE TYPE "public"."tick_status" AS ENUM('flash', 'send', 'attempt');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aurora_table_type') THEN
        CREATE TYPE "public"."aurora_table_type" AS ENUM('ascents', 'bids');
    END IF;
END $$;

-- Add aurora_credentials table if it doesn't exist
CREATE TABLE IF NOT EXISTS "aurora_credentials" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"encrypted_username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"aurora_user_id" integer,
	"aurora_token" text,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add boardsesh_ticks table if it doesn't exist
CREATE TABLE IF NOT EXISTS "boardsesh_ticks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"is_mirror" boolean DEFAULT false,
	"status" "tick_status" NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"quality" integer,
	"difficulty" integer,
	"is_benchmark" boolean DEFAULT false,
	"comment" text DEFAULT '',
	"climbed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"session_id" text,
	"aurora_type" "aurora_table_type",
	"aurora_id" text,
	"aurora_synced_at" timestamp,
	"aurora_sync_error" text,
	CONSTRAINT "boardsesh_ticks_uuid_unique" UNIQUE("uuid")
);

-- Add board_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "board_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"board_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"discoverable" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"name" text,
	"status" text DEFAULT 'active' NOT NULL
);

-- Add board_session_clients table if it doesn't exist
CREATE TABLE IF NOT EXISTS "board_session_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"username" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL
);

-- Add board_session_queues table if it doesn't exist
CREATE TABLE IF NOT EXISTS "board_session_queues" (
	"session_id" text PRIMARY KEY NOT NULL,
	"queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_climb_queue_item" jsonb DEFAULT 'null'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add playlists table if it doesn't exist
CREATE TABLE IF NOT EXISTS "playlists" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"board_type" text NOT NULL,
	"layout_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlists_uuid_unique" UNIQUE("uuid")
);

-- Add playlist_climbs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "playlist_climbs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"playlist_id" bigint NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);

-- Add playlist_ownership table if it doesn't exist
CREATE TABLE IF NOT EXISTS "playlist_ownership" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"playlist_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add synced columns to ascent/bid/climb tables if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_ascents' AND column_name = 'synced') THEN
        ALTER TABLE "kilter_ascents" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_ascents' AND column_name = 'sync_error') THEN
        ALTER TABLE "kilter_ascents" ADD COLUMN "sync_error" text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_ascents' AND column_name = 'synced') THEN
        ALTER TABLE "tension_ascents" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_ascents' AND column_name = 'sync_error') THEN
        ALTER TABLE "tension_ascents" ADD COLUMN "sync_error" text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_bids' AND column_name = 'synced') THEN
        ALTER TABLE "kilter_bids" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_bids' AND column_name = 'sync_error') THEN
        ALTER TABLE "kilter_bids" ADD COLUMN "sync_error" text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_bids' AND column_name = 'synced') THEN
        ALTER TABLE "tension_bids" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_bids' AND column_name = 'sync_error') THEN
        ALTER TABLE "tension_bids" ADD COLUMN "sync_error" text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_climbs' AND column_name = 'synced') THEN
        ALTER TABLE "kilter_climbs" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kilter_climbs' AND column_name = 'sync_error') THEN
        ALTER TABLE "kilter_climbs" ADD COLUMN "sync_error" text;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_climbs' AND column_name = 'synced') THEN
        ALTER TABLE "tension_climbs" ADD COLUMN "synced" boolean DEFAULT true NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tension_climbs' AND column_name = 'sync_error') THEN
        ALTER TABLE "tension_climbs" ADD COLUMN "sync_error" text;
    END IF;
END $$;

-- Add session status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'board_sessions' AND column_name = 'status') THEN
        ALTER TABLE "board_sessions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;
    END IF;
END $$;

-- Add foreign keys (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aurora_credentials_user_id_users_id_fk') THEN
        ALTER TABLE "aurora_credentials" ADD CONSTRAINT "aurora_credentials_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'board_session_clients_session_id_fk') THEN
        ALTER TABLE "board_session_clients" ADD CONSTRAINT "board_session_clients_session_id_fk"
            FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'board_session_queues_session_id_fk') THEN
        ALTER TABLE "board_session_queues" ADD CONSTRAINT "board_session_queues_session_id_fk"
            FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'board_sessions_created_by_user_id_fk') THEN
        ALTER TABLE "board_sessions" ADD CONSTRAINT "board_sessions_created_by_user_id_fk"
            FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boardsesh_ticks_user_id_users_id_fk') THEN
        ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boardsesh_ticks_session_id_board_sessions_id_fk') THEN
        ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_session_id_board_sessions_id_fk"
            FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_climbs_playlist_id_playlists_id_fk') THEN
        ALTER TABLE "playlist_climbs" ADD CONSTRAINT "playlist_climbs_playlist_id_playlists_id_fk"
            FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_ownership_playlist_id_playlists_id_fk') THEN
        ALTER TABLE "playlist_ownership" ADD CONSTRAINT "playlist_ownership_playlist_id_playlists_id_fk"
            FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_ownership_user_id_users_id_fk') THEN
        ALTER TABLE "playlist_ownership" ADD CONSTRAINT "playlist_ownership_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Create all indexes (IF NOT EXISTS is supported for indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_board_credential" ON "aurora_credentials" USING btree ("user_id","board_type");
CREATE INDEX IF NOT EXISTS "aurora_credentials_user_idx" ON "aurora_credentials" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "board_sessions_location_idx" ON "board_sessions" USING btree ("latitude","longitude");
CREATE INDEX IF NOT EXISTS "board_sessions_discoverable_idx" ON "board_sessions" USING btree ("discoverable");
CREATE INDEX IF NOT EXISTS "board_sessions_user_idx" ON "board_sessions" USING btree ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "board_sessions_status_idx" ON "board_sessions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "board_sessions_last_activity_idx" ON "board_sessions" USING btree ("last_activity");
CREATE INDEX IF NOT EXISTS "board_sessions_discovery_idx" ON "board_sessions" USING btree ("discoverable", "status", "last_activity");

CREATE INDEX IF NOT EXISTS "boardsesh_ticks_user_board_idx" ON "boardsesh_ticks" USING btree ("user_id","board_type");
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_climb_idx" ON "boardsesh_ticks" USING btree ("climb_uuid","board_type");
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_sync_pending_idx" ON "boardsesh_ticks" USING btree ("aurora_id","user_id");
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_session_idx" ON "boardsesh_ticks" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_climbed_at_idx" ON "boardsesh_ticks" USING btree ("climbed_at");

CREATE UNIQUE INDEX IF NOT EXISTS "unique_playlist_climb" ON "playlist_climbs" USING btree ("playlist_id","climb_uuid");
CREATE INDEX IF NOT EXISTS "playlist_climbs_climb_idx" ON "playlist_climbs" USING btree ("climb_uuid");
CREATE INDEX IF NOT EXISTS "playlist_climbs_position_idx" ON "playlist_climbs" USING btree ("playlist_id","position");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_playlist_ownership" ON "playlist_ownership" USING btree ("playlist_id","user_id");
CREATE INDEX IF NOT EXISTS "playlist_ownership_user_idx" ON "playlist_ownership" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "playlists_board_layout_idx" ON "playlists" USING btree ("board_type","layout_id");
CREATE INDEX IF NOT EXISTS "playlists_uuid_idx" ON "playlists" USING btree ("uuid");
CREATE INDEX IF NOT EXISTS "playlists_updated_at_idx" ON "playlists" USING btree ("updated_at");

CREATE INDEX IF NOT EXISTS "kilter_ascents_synced_idx" ON "kilter_ascents" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_ascents_synced_idx" ON "tension_ascents" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "kilter_bids_synced_idx" ON "kilter_bids" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_bids_synced_idx" ON "tension_bids" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "kilter_climbs_synced_idx" ON "kilter_climbs" ("synced") WHERE "synced" = false;
CREATE INDEX IF NOT EXISTS "tension_climbs_synced_idx" ON "tension_climbs" ("synced") WHERE "synced" = false;

-- Performance indexes from web-only migrations (0017_optimize_heatmap_indexes, 0021_optimize_climb_search)
-- Heatmap query optimization indexes
CREATE INDEX IF NOT EXISTS "idx_kilter_climb_holds_heatmap" ON "kilter_climb_holds" ("hold_id", "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_kilter_ascents_user_angle" ON "kilter_ascents" ("user_id", "angle", "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_kilter_bids_user_angle" ON "kilter_bids" ("user_id", "angle", "climb_uuid");

CREATE INDEX IF NOT EXISTS "idx_tension_climb_holds_heatmap" ON "tension_climb_holds" ("hold_id", "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_tension_ascents_user_angle" ON "tension_ascents" ("user_id", "angle", "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_tension_bids_user_angle" ON "tension_bids" ("user_id", "angle", "climb_uuid");

-- Climb search sort indexes
CREATE INDEX IF NOT EXISTS "idx_kilter_climb_stats_sort" ON "kilter_climb_stats" ("angle", "ascensionist_count" DESC NULLS LAST, "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_kilter_climb_stats_quality_sort" ON "kilter_climb_stats" ("angle", "quality_average" DESC NULLS LAST, "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_tension_climb_stats_sort" ON "tension_climb_stats" ("angle", "ascensionist_count" DESC NULLS LAST, "climb_uuid");
CREATE INDEX IF NOT EXISTS "idx_tension_climb_stats_quality_sort" ON "tension_climb_stats" ("angle", "quality_average" DESC NULLS LAST, "climb_uuid");
