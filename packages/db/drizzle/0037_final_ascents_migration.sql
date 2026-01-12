-- Migration: Final catch-up migration for ascents/bids before dropping legacy tables
-- This ensures any data written to legacy tables after migration 0026 is captured
-- Uses aurora_id as the unique key to prevent duplicates

-- Only run if legacy tables still exist (they may have been dropped by 0030)
DO $$
DECLARE
  kilter_ascents_exists boolean;
  tension_ascents_exists boolean;
  kilter_bids_exists boolean;
  tension_bids_exists boolean;
  migrated_count integer := 0;
  batch_count integer;
BEGIN
  -- Check which tables exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kilter_ascents') INTO kilter_ascents_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tension_ascents') INTO tension_ascents_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kilter_bids') INTO kilter_bids_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tension_bids') INTO tension_bids_exists;

  -- Migrate Kilter Ascents if table exists
  IF kilter_ascents_exists THEN
    INSERT INTO boardsesh_ticks (
      uuid, user_id, board_type, climb_uuid, angle, is_mirror, status,
      attempt_count, quality, difficulty, is_benchmark, comment,
      climbed_at, created_at, updated_at, aurora_type, aurora_id, aurora_synced_at
    )
    SELECT
      gen_random_uuid()::text,
      ac.user_id,
      'kilter',
      ka.climb_uuid,
      ka.angle,
      COALESCE(ka.is_mirror, false),
      CASE WHEN ka.attempt_id = 1 THEN 'flash'::tick_status ELSE 'send'::tick_status END,
      COALESCE(ka.bid_count, 1),
      CASE WHEN ka.quality IS NOT NULL THEN ROUND((ka.quality / 3.0) * 5)::integer ELSE NULL END,
      ka.difficulty,
      COALESCE(ka.is_benchmark::boolean, false),
      COALESCE(ka.comment, ''),
      ka.climbed_at::timestamp,
      COALESCE(ka.created_at::timestamp, NOW()),
      NOW(),
      'ascents'::aurora_table_type,
      ka.uuid,
      NOW()
    FROM kilter_ascents ka
    INNER JOIN aurora_credentials ac ON ac.aurora_user_id = ka.user_id AND ac.board_type = 'kilter'
    WHERE ka.uuid IS NOT NULL
    ON CONFLICT (aurora_id) DO NOTHING;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    migrated_count := migrated_count + batch_count;
    RAISE NOTICE 'Migrated % kilter ascents', batch_count;
  END IF;

  -- Migrate Tension Ascents if table exists
  IF tension_ascents_exists THEN
    INSERT INTO boardsesh_ticks (
      uuid, user_id, board_type, climb_uuid, angle, is_mirror, status,
      attempt_count, quality, difficulty, is_benchmark, comment,
      climbed_at, created_at, updated_at, aurora_type, aurora_id, aurora_synced_at
    )
    SELECT
      gen_random_uuid()::text,
      ac.user_id,
      'tension',
      ta.climb_uuid,
      ta.angle,
      COALESCE(ta.is_mirror, false),
      CASE WHEN ta.attempt_id = 1 THEN 'flash'::tick_status ELSE 'send'::tick_status END,
      COALESCE(ta.bid_count, 1),
      CASE WHEN ta.quality IS NOT NULL THEN ROUND((ta.quality / 3.0) * 5)::integer ELSE NULL END,
      ta.difficulty,
      COALESCE(ta.is_benchmark::boolean, false),
      COALESCE(ta.comment, ''),
      ta.climbed_at::timestamp,
      COALESCE(ta.created_at::timestamp, NOW()),
      NOW(),
      'ascents'::aurora_table_type,
      ta.uuid,
      NOW()
    FROM tension_ascents ta
    INNER JOIN aurora_credentials ac ON ac.aurora_user_id = ta.user_id AND ac.board_type = 'tension'
    WHERE ta.uuid IS NOT NULL
    ON CONFLICT (aurora_id) DO NOTHING;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    migrated_count := migrated_count + batch_count;
    RAISE NOTICE 'Migrated % tension ascents', batch_count;
  END IF;

  -- Migrate Kilter Bids if table exists
  IF kilter_bids_exists THEN
    INSERT INTO boardsesh_ticks (
      uuid, user_id, board_type, climb_uuid, angle, is_mirror, status,
      attempt_count, quality, difficulty, is_benchmark, comment,
      climbed_at, created_at, updated_at, aurora_type, aurora_id, aurora_synced_at
    )
    SELECT
      gen_random_uuid()::text,
      ac.user_id,
      'kilter',
      kb.climb_uuid,
      kb.angle,
      COALESCE(kb.is_mirror, false),
      'attempt'::tick_status,
      COALESCE(kb.bid_count, 1),
      NULL,
      NULL,
      false,
      COALESCE(kb.comment, ''),
      kb.climbed_at::timestamp,
      COALESCE(kb.created_at::timestamp, NOW()),
      NOW(),
      'bids'::aurora_table_type,
      kb.uuid,
      NOW()
    FROM kilter_bids kb
    INNER JOIN aurora_credentials ac ON ac.aurora_user_id = kb.user_id AND ac.board_type = 'kilter'
    WHERE kb.uuid IS NOT NULL
    ON CONFLICT (aurora_id) DO NOTHING;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    migrated_count := migrated_count + batch_count;
    RAISE NOTICE 'Migrated % kilter bids', batch_count;
  END IF;

  -- Migrate Tension Bids if table exists
  IF tension_bids_exists THEN
    INSERT INTO boardsesh_ticks (
      uuid, user_id, board_type, climb_uuid, angle, is_mirror, status,
      attempt_count, quality, difficulty, is_benchmark, comment,
      climbed_at, created_at, updated_at, aurora_type, aurora_id, aurora_synced_at
    )
    SELECT
      gen_random_uuid()::text,
      ac.user_id,
      'tension',
      tb.climb_uuid,
      tb.angle,
      COALESCE(tb.is_mirror, false),
      'attempt'::tick_status,
      COALESCE(tb.bid_count, 1),
      NULL,
      NULL,
      false,
      COALESCE(tb.comment, ''),
      tb.climbed_at::timestamp,
      COALESCE(tb.created_at::timestamp, NOW()),
      NOW(),
      'bids'::aurora_table_type,
      tb.uuid,
      NOW()
    FROM tension_bids tb
    INNER JOIN aurora_credentials ac ON ac.aurora_user_id = tb.user_id AND ac.board_type = 'tension'
    WHERE tb.uuid IS NOT NULL
    ON CONFLICT (aurora_id) DO NOTHING;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    migrated_count := migrated_count + batch_count;
    RAISE NOTICE 'Migrated % tension bids', batch_count;
  END IF;

  RAISE NOTICE 'Total migrated: % records', migrated_count;
END $$;
