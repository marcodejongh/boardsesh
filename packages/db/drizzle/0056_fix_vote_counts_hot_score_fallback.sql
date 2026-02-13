-- Fix update_vote_counts trigger to use MIN(votes.created_at) as fallback
-- instead of NOW() when no feed_items row exists.
--
-- Previously the trigger used NOW() as the fallback, while the backfill in
-- 0053_add_vote_counts.sql used MIN(v.created_at). This caused inconsistent
-- hot_score calculations: when a previously-backfilled entity received a new
-- vote, the trigger would recalculate using NOW() instead of the original
-- earliest vote time, artificially boosting the entity's hot_score.

CREATE OR REPLACE FUNCTION update_vote_counts() RETURNS trigger AS $$
DECLARE
  v_entity_type social_entity_type;
  v_entity_id text;
  v_up int;
  v_down int;
  v_score int;
  v_hot_score double precision;
  v_created_at timestamp;
BEGIN
  -- Determine which entity was affected
  IF TG_OP = 'DELETE' THEN
    v_entity_type := OLD.entity_type;
    v_entity_id := OLD.entity_id;
  ELSE
    v_entity_type := NEW.entity_type;
    v_entity_id := NEW.entity_id;
  END IF;

  -- Recount (safe, idempotent)
  SELECT
    COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0)
  INTO v_up, v_down
  FROM votes
  WHERE entity_type = v_entity_type AND entity_id = v_entity_id;

  v_score := v_up - v_down;

  -- Get entity creation time from feed_items if available, otherwise fall back
  -- to the earliest vote time. Using MIN(created_at) from votes is consistent
  -- with the backfill logic and provides a stable proxy for entity age.
  SELECT COALESCE(
    (SELECT fi."created_at" FROM feed_items fi
     WHERE fi."entity_type" = v_entity_type::text AND fi."entity_id" = v_entity_id
     LIMIT 1),
    (SELECT MIN(vt."created_at") FROM votes vt
     WHERE vt."entity_type" = v_entity_type AND vt."entity_id" = v_entity_id)
  ) INTO v_created_at;

  -- Final fallback to NOW() only if no votes exist (shouldn't happen in
  -- practice since this trigger fires on the votes table)
  IF v_created_at IS NULL THEN
    v_created_at := NOW();
  END IF;

  -- Hot score: sign(score) * ln(max(|score|, 1)) + epoch/45000
  v_hot_score := SIGN(v_score) * LN(GREATEST(ABS(v_score), 1))
    + EXTRACT(EPOCH FROM v_created_at) / 45000.0;

  -- Upsert
  INSERT INTO vote_counts (entity_type, entity_id, upvotes, downvotes, score, hot_score, created_at)
  VALUES (v_entity_type, v_entity_id, v_up, v_down, v_score, v_hot_score, v_created_at)
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    upvotes = EXCLUDED.upvotes,
    downvotes = EXCLUDED.downvotes,
    score = EXCLUDED.score,
    hot_score = EXCLUDED.hot_score;

  -- Clean up zero-vote rows
  IF v_up = 0 AND v_down = 0 THEN
    DELETE FROM vote_counts WHERE entity_type = v_entity_type AND entity_id = v_entity_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
