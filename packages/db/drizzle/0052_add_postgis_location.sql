-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location column (geography type for distance calculations in meters)
ALTER TABLE user_boards ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Create spatial index for proximity search (only on public, non-deleted boards)
CREATE INDEX IF NOT EXISTS user_boards_location_gist_idx
  ON user_boards USING GIST (location)
  WHERE is_public = true AND deleted_at IS NULL;

-- Backfill existing boards that have lat/lon
UPDATE user_boards
  SET location = ST_MakePoint(longitude, latitude)::geography
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
