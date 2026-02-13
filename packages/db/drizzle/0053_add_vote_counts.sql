CREATE TABLE "vote_counts" (
	"entity_type" "social_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"hot_score" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "vote_counts_entity_type_entity_id_pk" PRIMARY KEY("entity_type","entity_id")
);
--> statement-breakpoint
CREATE INDEX "vote_counts_score_idx" ON "vote_counts" USING btree ("entity_type","score");
--> statement-breakpoint
CREATE INDEX "vote_counts_hot_score_idx" ON "vote_counts" USING btree ("entity_type","hot_score");
--> statement-breakpoint

-- Trigger function to maintain vote_counts
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

  -- Get entity creation time for hot score (use earliest vote if unknown)
  SELECT COALESCE(MIN(created_at), NOW()) INTO v_created_at
  FROM votes WHERE entity_type = v_entity_type AND entity_id = v_entity_id;

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

CREATE TRIGGER votes_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Backfill existing votes
INSERT INTO vote_counts (entity_type, entity_id, upvotes, downvotes, score, hot_score, created_at)
SELECT
  entity_type,
  entity_id,
  SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as upvotes,
  SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as downvotes,
  SUM(value) as score,
  SIGN(SUM(value)) * LN(GREATEST(ABS(SUM(value)), 1))
    + EXTRACT(EPOCH FROM MIN(created_at)) / 45000.0 as hot_score,
  MIN(created_at) as created_at
FROM votes
GROUP BY entity_type, entity_id
ON CONFLICT (entity_type, entity_id) DO NOTHING;
