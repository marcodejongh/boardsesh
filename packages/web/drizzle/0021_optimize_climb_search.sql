-- Optimization: Add sort indexes for common query patterns
-- These indexes support the ORDER BY clauses in searchClimbs

-- Kilter sort indexes (ascending count for popularity sorting)
CREATE INDEX IF NOT EXISTS idx_kilter_climb_stats_sort
ON kilter_climb_stats (angle, ascensionist_count DESC NULLS LAST, climb_uuid);

CREATE INDEX IF NOT EXISTS idx_kilter_climb_stats_quality_sort
ON kilter_climb_stats (angle, quality_average DESC NULLS LAST, climb_uuid);

-- Tension sort indexes
CREATE INDEX IF NOT EXISTS idx_tension_climb_stats_sort
ON tension_climb_stats (angle, ascensionist_count DESC NULLS LAST, climb_uuid);

CREATE INDEX IF NOT EXISTS idx_tension_climb_stats_quality_sort
ON tension_climb_stats (angle, quality_average DESC NULLS LAST, climb_uuid);
