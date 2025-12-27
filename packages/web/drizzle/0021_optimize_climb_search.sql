-- Migration: Optimize climb search query performance
-- This migration adds indexes and a generated column to improve query performance

-- Phase 2: Add rounded_difficulty generated column to avoid ROUND() in JOIN
-- Using a stored generated column allows efficient indexing and JOIN operations

-- Kilter climb stats
ALTER TABLE kilter_climb_stats
ADD COLUMN IF NOT EXISTS rounded_difficulty integer
GENERATED ALWAYS AS (ROUND(display_difficulty::numeric)::integer) STORED;

-- Tension climb stats
ALTER TABLE tension_climb_stats
ADD COLUMN IF NOT EXISTS rounded_difficulty integer
GENERATED ALWAYS AS (ROUND(display_difficulty::numeric)::integer) STORED;

-- Create indexes on rounded_difficulty for efficient JOINs with difficulty_grades
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kilter_climb_stats_rounded_difficulty
ON kilter_climb_stats (rounded_difficulty);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tension_climb_stats_rounded_difficulty
ON tension_climb_stats (rounded_difficulty);

-- Phase 4: Add sort indexes for common sort operations
-- These indexes support efficient sorting by ascensionist_count and quality_average

-- Kilter: Sort by ascensionist count (most common sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kilter_climb_stats_sort_ascents
ON kilter_climb_stats (angle, ascensionist_count DESC NULLS LAST, climb_uuid);

-- Tension: Sort by ascensionist count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tension_climb_stats_sort_ascents
ON tension_climb_stats (angle, ascensionist_count DESC NULLS LAST, climb_uuid);

-- Kilter: Sort by quality average
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kilter_climb_stats_sort_quality
ON kilter_climb_stats (angle, quality_average DESC NULLS LAST, climb_uuid);

-- Tension: Sort by quality average
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tension_climb_stats_sort_quality
ON tension_climb_stats (angle, quality_average DESC NULLS LAST, climb_uuid);

-- Kilter: Sort by difficulty (using rounded_difficulty)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kilter_climb_stats_sort_difficulty
ON kilter_climb_stats (angle, rounded_difficulty DESC NULLS LAST, climb_uuid);

-- Tension: Sort by difficulty (using rounded_difficulty)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tension_climb_stats_sort_difficulty
ON tension_climb_stats (angle, rounded_difficulty DESC NULLS LAST, climb_uuid);

-- Update statistics for query planner
ANALYZE kilter_climb_stats;
ANALYZE tension_climb_stats;
