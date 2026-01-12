-- Add hand_rating, foot_rating, and pull_direction columns to user_hold_classifications
-- Migrate existing difficulty_rating data to hand_rating before dropping
-- Update hold_type enum to remove edge, sidepull, undercling
-- This migration is idempotent (safe to run multiple times)

-- Add hand_rating if it doesn't exist
ALTER TABLE "user_hold_classifications" ADD COLUMN IF NOT EXISTS "hand_rating" integer;

-- Add foot_rating if it doesn't exist
ALTER TABLE "user_hold_classifications" ADD COLUMN IF NOT EXISTS "foot_rating" integer;

-- Add pull_direction if it doesn't exist
ALTER TABLE "user_hold_classifications" ADD COLUMN IF NOT EXISTS "pull_direction" integer;

-- Migrate existing difficulty_rating data to hand_rating (only if difficulty_rating column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_hold_classifications' AND column_name = 'difficulty_rating'
  ) THEN
    UPDATE "user_hold_classifications" SET "hand_rating" = "difficulty_rating" WHERE "difficulty_rating" IS NOT NULL AND "hand_rating" IS NULL;
    ALTER TABLE "user_hold_classifications" DROP COLUMN "difficulty_rating";
  END IF;
END $$;

-- Update hold_type enum: remove edge, sidepull, undercling
DO $$
BEGIN
  -- Check if old enum values still exist
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'edge' AND enumtypid = 'hold_type'::regtype
  ) THEN
    -- Convert any existing deprecated hold types to NULL
    UPDATE "user_hold_classifications" SET "hold_type" = NULL WHERE "hold_type" IN ('edge', 'sidepull', 'undercling');

    -- Create new enum with only the desired values
    CREATE TYPE "hold_type_new" AS ENUM ('jug', 'sloper', 'pinch', 'crimp', 'pocket');

    -- Update column to use new enum type
    ALTER TABLE "user_hold_classifications"
      ALTER COLUMN "hold_type" TYPE "hold_type_new"
      USING "hold_type"::text::"hold_type_new";

    -- Drop old enum and rename new one
    DROP TYPE "hold_type";
    ALTER TYPE "hold_type_new" RENAME TO "hold_type";
  END IF;
END $$;
