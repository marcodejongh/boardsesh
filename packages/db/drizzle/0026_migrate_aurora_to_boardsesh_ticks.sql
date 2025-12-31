-- Migration: Migrate Aurora ascents/bids to boardsesh_ticks
-- This migration is idempotent and only migrates users with NextAuth accounts

-- Migrate historical Aurora data to unified boardsesh_ticks table
DO $$
DECLARE
  migrated_count integer;
BEGIN
  -- Migrate Kilter Ascents (Flash/Send)
  WITH kilter_ascents_to_migrate AS (
    SELECT
      gen_random_uuid()::text AS uuid,
      ac.user_id AS user_id,
      'kilter' AS board_type,
      ka.climb_uuid,
      ka.angle,
      COALESCE(ka.is_mirror, false) AS is_mirror,
      CASE
        WHEN ka.attempt_id = 1 THEN 'flash'::tick_status
        ELSE 'send'::tick_status
      END AS status,
      COALESCE(ka.bid_count, 1) AS attempt_count,
      ROUND((ka.quality / 3.0) * 5)::integer AS quality,
      ka.difficulty,
      COALESCE(ka.is_benchmark::boolean, false) AS is_benchmark,
      COALESCE(ka.comment, '') AS comment,
      ka.climbed_at::timestamp::text AS climbed_at,
      ka.created_at::timestamp::text AS created_at,
      'ascents'::aurora_table_type AS aurora_type,
      ka.uuid AS aurora_id
    FROM kilter_ascents ka
    INNER JOIN aurora_credentials ac
      ON ac.aurora_user_id = ka.user_id
      AND ac.board_type = 'kilter'
    WHERE NOT EXISTS (
      SELECT 1 FROM boardsesh_ticks bt
      WHERE bt.aurora_id = ka.uuid
    )
  ),

  -- Migrate Kilter Bids (Attempts)
  kilter_bids_to_migrate AS (
    SELECT
      gen_random_uuid()::text AS uuid,
      ac.user_id AS user_id,
      'kilter' AS board_type,
      kb.climb_uuid,
      kb.angle,
      COALESCE(kb.is_mirror, false) AS is_mirror,
      'attempt'::tick_status AS status,
      COALESCE(kb.bid_count, 1) AS attempt_count,
      NULL::integer AS quality,
      NULL::integer AS difficulty,
      false AS is_benchmark,
      COALESCE(kb.comment, '') AS comment,
      kb.climbed_at::timestamp::text AS climbed_at,
      kb.created_at::timestamp::text AS created_at,
      'bids'::aurora_table_type AS aurora_type,
      kb.uuid AS aurora_id
    FROM kilter_bids kb
    INNER JOIN aurora_credentials ac
      ON ac.aurora_user_id = kb.user_id
      AND ac.board_type = 'kilter'
    WHERE NOT EXISTS (
      SELECT 1 FROM boardsesh_ticks bt
      WHERE bt.aurora_id = kb.uuid
    )
  ),

  -- Migrate Tension Ascents (Flash/Send)
  tension_ascents_to_migrate AS (
    SELECT
      gen_random_uuid()::text AS uuid,
      ac.user_id AS user_id,
      'tension' AS board_type,
      ta.climb_uuid,
      ta.angle,
      COALESCE(ta.is_mirror, false) AS is_mirror,
      CASE
        WHEN ta.attempt_id = 1 THEN 'flash'::tick_status
        ELSE 'send'::tick_status
      END AS status,
      COALESCE(ta.bid_count, 1) AS attempt_count,
      ROUND((ta.quality / 3.0) * 5)::integer AS quality,
      ta.difficulty,
      COALESCE(ta.is_benchmark::boolean, false) AS is_benchmark,
      COALESCE(ta.comment, '') AS comment,
      ta.climbed_at::timestamp::text AS climbed_at,
      ta.created_at::timestamp::text AS created_at,
      'ascents'::aurora_table_type AS aurora_type,
      ta.uuid AS aurora_id
    FROM tension_ascents ta
    INNER JOIN aurora_credentials ac
      ON ac.aurora_user_id = ta.user_id
      AND ac.board_type = 'tension'
    WHERE NOT EXISTS (
      SELECT 1 FROM boardsesh_ticks bt
      WHERE bt.aurora_id = ta.uuid
    )
  ),

  -- Migrate Tension Bids (Attempts)
  tension_bids_to_migrate AS (
    SELECT
      gen_random_uuid()::text AS uuid,
      ac.user_id AS user_id,
      'tension' AS board_type,
      tb.climb_uuid,
      tb.angle,
      COALESCE(tb.is_mirror, false) AS is_mirror,
      'attempt'::tick_status AS status,
      COALESCE(tb.bid_count, 1) AS attempt_count,
      NULL::integer AS quality,
      NULL::integer AS difficulty,
      false AS is_benchmark,
      COALESCE(tb.comment, '') AS comment,
      tb.climbed_at::timestamp::text AS climbed_at,
      tb.created_at::timestamp::text AS created_at,
      'bids'::aurora_table_type AS aurora_type,
      tb.uuid AS aurora_id
    FROM tension_bids tb
    INNER JOIN aurora_credentials ac
      ON ac.aurora_user_id = tb.user_id
      AND ac.board_type = 'tension'
    WHERE NOT EXISTS (
      SELECT 1 FROM boardsesh_ticks bt
      WHERE bt.aurora_id = tb.uuid
    )
  ),

  -- Union all migrations
  all_ticks_to_migrate AS (
    SELECT * FROM kilter_ascents_to_migrate
    UNION ALL
    SELECT * FROM kilter_bids_to_migrate
    UNION ALL
    SELECT * FROM tension_ascents_to_migrate
    UNION ALL
    SELECT * FROM tension_bids_to_migrate
  )

  -- Insert into boardsesh_ticks
  INSERT INTO boardsesh_ticks (
    uuid,
    user_id,
    board_type,
    climb_uuid,
    angle,
    is_mirror,
    status,
    attempt_count,
    quality,
    difficulty,
    is_benchmark,
    comment,
    climbed_at,
    created_at,
    updated_at,
    aurora_type,
    aurora_id,
    aurora_synced_at
  )
  SELECT
    uuid,
    user_id,
    board_type,
    climb_uuid,
    angle,
    is_mirror,
    status,
    attempt_count,
    quality,
    difficulty,
    is_benchmark,
    comment,
    climbed_at,
    created_at,
    NOW()::text, -- updated_at
    aurora_type,
    aurora_id,
    NOW()::text  -- aurora_synced_at
  FROM all_ticks_to_migrate;

  -- Log migration count
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % historical ticks from Aurora to boardsesh_ticks', migrated_count;
END $$;
