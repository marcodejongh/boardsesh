-- Optimized indexes for heatmap query performance
-- These indexes support the GROUP BY hold_id aggregation and user-specific data lookups

-- KILTER board indexes
-- Index on climb_holds with hold_id first for better GROUP BY aggregation
DROP INDEX IF EXISTS idx_kilter_climb_holds_heatmap;
CREATE INDEX idx_kilter_climb_holds_heatmap
ON kilter_climb_holds (hold_id, climb_uuid)
INCLUDE (hold_state);

-- Index on ascents for user-specific heatmap queries
DROP INDEX IF EXISTS idx_kilter_ascents_user_angle;
CREATE INDEX idx_kilter_ascents_user_angle
ON kilter_ascents (user_id, angle, climb_uuid);

-- Index on bids for user-specific heatmap queries
DROP INDEX IF EXISTS idx_kilter_bids_user_angle;
CREATE INDEX idx_kilter_bids_user_angle
ON kilter_bids (user_id, angle, climb_uuid);

-- TENSION board indexes
DROP INDEX IF EXISTS idx_tension_climb_holds_heatmap;
CREATE INDEX idx_tension_climb_holds_heatmap
ON tension_climb_holds (hold_id, climb_uuid)
INCLUDE (hold_state);

DROP INDEX IF EXISTS idx_tension_ascents_user_angle;
CREATE INDEX idx_tension_ascents_user_angle
ON tension_ascents (user_id, angle, climb_uuid);

DROP INDEX IF EXISTS idx_tension_bids_user_angle;
CREATE INDEX idx_tension_bids_user_angle
ON tension_bids (user_id, angle, climb_uuid);

-- DECOY board indexes (if tables exist)
DROP INDEX IF EXISTS idx_decoy_climb_holds_heatmap;
CREATE INDEX IF NOT EXISTS idx_decoy_climb_holds_heatmap
ON decoy_climb_holds (hold_id, climb_uuid)
INCLUDE (hold_state);

DROP INDEX IF EXISTS idx_decoy_ascents_user_angle;
CREATE INDEX IF NOT EXISTS idx_decoy_ascents_user_angle
ON decoy_ascents (user_id, angle, climb_uuid);

DROP INDEX IF EXISTS idx_decoy_bids_user_angle;
CREATE INDEX IF NOT EXISTS idx_decoy_bids_user_angle
ON decoy_bids (user_id, angle, climb_uuid);

-- Update statistics for query planner
ANALYZE kilter_climb_holds;
ANALYZE kilter_ascents;
ANALYZE kilter_bids;
ANALYZE tension_climb_holds;
ANALYZE tension_ascents;
ANALYZE tension_bids;
