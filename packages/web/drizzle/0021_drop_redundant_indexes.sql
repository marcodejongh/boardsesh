-- Drop redundant indexes on tension_climb_holds
-- These indexes are redundant with existing indexes and waste ~224 MB of storage

-- This index is redundant with idx_tension_climb_holds_main
-- _main: (climb_uuid, hold_id) INCLUDE (hold_state) - 123 MB
-- _enhanced: (climb_uuid, hold_id, hold_state) - 122 MB (redundant)
DROP INDEX IF EXISTS idx_tension_climb_holds_enhanced;

-- This index was manually created and isn't used by any queries
-- The tension_climb_holds_search_idx (hold_id, hold_state) serves the same purpose
DROP INDEX IF EXISTS idx_tension_climb_holds_states;

-- Also clean up orphaned records in climb_holds tables
-- These are holds referencing climbs that no longer exist
DELETE FROM kilter_climb_holds
WHERE NOT EXISTS (
    SELECT 1 FROM kilter_climbs WHERE uuid = kilter_climb_holds.climb_uuid
);

DELETE FROM tension_climb_holds
WHERE NOT EXISTS (
    SELECT 1 FROM tension_climbs WHERE uuid = tension_climb_holds.climb_uuid
);

-- Update statistics after cleanup
ANALYZE tension_climb_holds;
ANALYZE kilter_climb_holds;
