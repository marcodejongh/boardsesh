-- Migration: Drop legacy ascents and bids tables
-- These tables are no longer used after switching to boardsesh_ticks
-- All ascent/bid data is now stored in boardsesh_ticks with NextAuth userId

-- Drop legacy ascents tables
DROP TABLE IF EXISTS kilter_ascents;
DROP TABLE IF EXISTS tension_ascents;

-- Drop legacy bids tables
DROP TABLE IF EXISTS kilter_bids;
DROP TABLE IF EXISTS tension_bids;
