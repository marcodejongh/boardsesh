-- 1. Index for climb holds
DROP INDEX IF EXISTS idx_tension_climb_holds_main;
CREATE INDEX idx_tension_climb_holds_main
ON tension_climb_holds (climb_uuid, hold_id)
INCLUDE (hold_state);

-- 2. Index for climb stats
DROP INDEX IF EXISTS idx_tension_climb_stats_main;
CREATE INDEX idx_tension_climb_stats_main
ON tension_climb_stats (climb_uuid, angle)
INCLUDE (display_difficulty);

-- 3. Index for product sizes
DROP INDEX IF EXISTS idx_tension_product_sizes_main;
CREATE INDEX idx_tension_product_sizes_main
ON tension_product_sizes (id)
INCLUDE (edge_left, edge_right, edge_bottom, edge_top);

-- 4. Materialized view for product sizes (if they rarely change)
DROP MATERIALIZED VIEW IF EXISTS tension_product_sizes_mv;
CREATE MATERIALIZED VIEW tension_product_sizes_mv AS
SELECT id, edge_left, edge_right, edge_bottom, edge_top
FROM tension_product_sizes;

CREATE UNIQUE INDEX idx_tension_product_sizes_mv_id 
ON tension_product_sizes_mv (id);

-- 5. Improve planner statistics
ALTER TABLE tension_climbs ALTER COLUMN is_listed SET STATISTICS 1000;
ALTER TABLE tension_climbs ALTER COLUMN is_draft SET STATISTICS 1000;
ALTER TABLE tension_climbs ALTER COLUMN frames_count SET STATISTICS 1000;

-- 6. Update statistics
ANALYZE tension_climbs;
ANALYZE tension_climb_holds;
ANALYZE tension_climb_stats;
ANALYZE tension_product_sizes;
ANALYZE tension_product_sizes_mv;

-- 1. Index for climb holds
DROP INDEX IF EXISTS idx_kilter_climb_holds_main;
CREATE INDEX idx_kilter_climb_holds_main
ON kilter_climb_holds (climb_uuid, hold_id)
INCLUDE (hold_state);

-- 2. Index for climb stats
DROP INDEX IF EXISTS idx_kilter_climb_stats_main;
CREATE INDEX idx_kilter_climb_stats_main
ON kilter_climb_stats (climb_uuid, angle)
INCLUDE (display_difficulty);

-- 3. Index for product sizes
DROP INDEX IF EXISTS idx_kilter_product_sizes_main;
CREATE INDEX idx_kilter_product_sizes_main
ON kilter_product_sizes (id)
INCLUDE (edge_left, edge_right, edge_bottom, edge_top);

-- 4. Materialized view for product sizes (if they rarely change)
DROP MATERIALIZED VIEW IF EXISTS kilter_product_sizes_mv;
CREATE MATERIALIZED VIEW kilter_product_sizes_mv AS
SELECT id, edge_left, edge_right, edge_bottom, edge_top
FROM kilter_product_sizes;

CREATE UNIQUE INDEX idx_kilter_product_sizes_mv_id 
ON kilter_product_sizes_mv (id);

-- 5. Improve planner statistics
ALTER TABLE kilter_climbs ALTER COLUMN is_listed SET STATISTICS 1000;
ALTER TABLE kilter_climbs ALTER COLUMN is_draft SET STATISTICS 1000;
ALTER TABLE kilter_climbs ALTER COLUMN frames_count SET STATISTICS 1000;

-- 6. Update statistics
ANALYZE kilter_climbs;
ANALYZE kilter_climb_holds;
ANALYZE kilter_climb_stats;
ANALYZE kilter_product_sizes;
ANALYZE kilter_product_sizes_mv;