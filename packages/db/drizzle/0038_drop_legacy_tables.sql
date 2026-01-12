-- Migration: Drop legacy board-specific tables
-- These tables have been superseded by unified board_* tables
-- All data was migrated in migration 0025_shocking_clint_barton.sql

-- Phase 6b: Drop user data tables (12 tables)
DROP TABLE IF EXISTS kilter_tags;
DROP TABLE IF EXISTS tension_tags;
DROP TABLE IF EXISTS kilter_circuits_climbs;
DROP TABLE IF EXISTS tension_circuits_climbs;
DROP TABLE IF EXISTS kilter_circuits;
DROP TABLE IF EXISTS tension_circuits;
DROP TABLE IF EXISTS kilter_walls;
DROP TABLE IF EXISTS tension_walls;
DROP TABLE IF EXISTS kilter_user_syncs;
DROP TABLE IF EXISTS tension_user_syncs;
DROP TABLE IF EXISTS kilter_shared_syncs;
DROP TABLE IF EXISTS tension_shared_syncs;

-- Phase 6b: Drop climb tables (10 tables)
DROP TABLE IF EXISTS kilter_beta_links;
DROP TABLE IF EXISTS tension_beta_links;
DROP TABLE IF EXISTS kilter_climb_stats_history;
DROP TABLE IF EXISTS tension_climb_stats_history;
DROP TABLE IF EXISTS kilter_climb_holds;
DROP TABLE IF EXISTS tension_climb_holds;
DROP TABLE IF EXISTS kilter_climb_stats;
DROP TABLE IF EXISTS tension_climb_stats;
DROP TABLE IF EXISTS kilter_climbs;
DROP TABLE IF EXISTS tension_climbs;

-- Phase 6b: Drop product config tables (18 tables)
DROP TABLE IF EXISTS kilter_product_sizes_layouts_sets;
DROP TABLE IF EXISTS tension_product_sizes_layouts_sets;
DROP TABLE IF EXISTS kilter_placements;
DROP TABLE IF EXISTS tension_placements;
DROP TABLE IF EXISTS kilter_leds;
DROP TABLE IF EXISTS tension_leds;
DROP TABLE IF EXISTS kilter_placement_roles;
DROP TABLE IF EXISTS tension_placement_roles;
DROP TABLE IF EXISTS kilter_holes;
DROP TABLE IF EXISTS tension_holes;
DROP TABLE IF EXISTS kilter_layouts;
DROP TABLE IF EXISTS tension_layouts;
DROP TABLE IF EXISTS kilter_product_sizes;
DROP TABLE IF EXISTS tension_product_sizes;
DROP TABLE IF EXISTS kilter_sets;
DROP TABLE IF EXISTS tension_sets;
DROP TABLE IF EXISTS kilter_products;
DROP TABLE IF EXISTS tension_products;

-- Phase 6b: Drop reference tables (4 tables)
DROP TABLE IF EXISTS kilter_difficulty_grades;
DROP TABLE IF EXISTS tension_difficulty_grades;
DROP TABLE IF EXISTS kilter_attempts;
DROP TABLE IF EXISTS tension_attempts;

-- Phase 6b: Drop user tables (2 tables)
DROP TABLE IF EXISTS kilter_users;
DROP TABLE IF EXISTS tension_users;
