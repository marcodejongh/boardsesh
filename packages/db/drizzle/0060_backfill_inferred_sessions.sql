-- Backfill: assign inferred sessions to all ungrouped ticks
-- (ticks with neither session_id nor inferred_session_id set)
-- Uses the same UUIDv5 namespace as the TypeScript builder for deterministic IDs.
-- Groups ticks per-user using a 4-hour gap heuristic (14400 seconds).

-- Enable uuid-ossp for uuid_generate_v5 (supported on Neon and standard PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--> statement-breakpoint

-- Step 1: Build a temp table mapping each ungrouped tick to its inferred session ID
CREATE TEMP TABLE _backfill_tick_sessions AS
WITH tick_gaps AS (
  SELECT
    uuid,
    user_id,
    climbed_at,
    status,
    LAG(climbed_at) OVER (PARTITION BY user_id ORDER BY climbed_at) AS prev_climbed_at
  FROM boardsesh_ticks
  WHERE session_id IS NULL AND inferred_session_id IS NULL
),
tick_with_groups AS (
  SELECT
    uuid,
    user_id,
    climbed_at,
    status,
    SUM(CASE
      WHEN prev_climbed_at IS NULL
        OR EXTRACT(EPOCH FROM (climbed_at::timestamp - prev_climbed_at::timestamp)) > 14400
      THEN 1
      ELSE 0
    END) OVER (PARTITION BY user_id ORDER BY climbed_at) AS session_group
  FROM tick_gaps
),
group_first_tick AS (
  SELECT user_id, session_group, MIN(climbed_at) AS first_tick_at
  FROM tick_with_groups
  GROUP BY user_id, session_group
)
SELECT
  t.uuid AS tick_uuid,
  t.user_id,
  t.climbed_at,
  t.status,
  uuid_generate_v5(
    '6ba7b812-9dad-11d1-80b4-00c04fd430c8'::uuid,
    t.user_id || ':' || gft.first_tick_at
  )::text AS inferred_session_id
FROM tick_with_groups t
JOIN group_first_tick gft
  ON t.user_id = gft.user_id AND t.session_group = gft.session_group;
--> statement-breakpoint

-- Step 2: Insert inferred session records (upsert to handle partially-existing sessions)
INSERT INTO inferred_sessions (id, user_id, first_tick_at, last_tick_at, tick_count, total_sends, total_flashes, total_attempts)
SELECT
  inferred_session_id,
  user_id,
  MIN(climbed_at),
  MAX(climbed_at),
  COUNT(*),
  COUNT(*) FILTER (WHERE status IN ('flash', 'send')),
  COUNT(*) FILTER (WHERE status = 'flash'),
  COUNT(*) FILTER (WHERE status = 'attempt')
FROM _backfill_tick_sessions
GROUP BY inferred_session_id, user_id
ON CONFLICT (id) DO UPDATE SET
  first_tick_at = LEAST(inferred_sessions.first_tick_at, EXCLUDED.first_tick_at),
  last_tick_at = GREATEST(inferred_sessions.last_tick_at, EXCLUDED.last_tick_at),
  tick_count = inferred_sessions.tick_count + EXCLUDED.tick_count,
  total_sends = inferred_sessions.total_sends + EXCLUDED.total_sends,
  total_flashes = inferred_sessions.total_flashes + EXCLUDED.total_flashes,
  total_attempts = inferred_sessions.total_attempts + EXCLUDED.total_attempts;
--> statement-breakpoint

-- Step 3: Assign inferred_session_id to each ungrouped tick
UPDATE boardsesh_ticks bt
SET inferred_session_id = bts.inferred_session_id
FROM _backfill_tick_sessions bts
WHERE bt.uuid = bts.tick_uuid;
--> statement-breakpoint

-- Step 4: Clean up
DROP TABLE _backfill_tick_sessions;
