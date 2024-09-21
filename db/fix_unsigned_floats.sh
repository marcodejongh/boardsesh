#!/bin/bash

# Update the FLOAT UNSIGNED columns to regular FLOAT in both tables
sqlite3 $DB_FILE <<EOF
PRAGMA foreign_keys = OFF;
-- Create a new table for climb_cache_fields with regular FLOAT columns
DROP TABLE IF EXISTS climb_cache_fields_new;
CREATE TABLE climb_cache_fields_new (
    climb_uuid TEXT NOT NULL,
    ascensionist_count INT DEFAULT NULL,
    display_difficulty FLOAT DEFAULT NULL,
    quality_average FLOAT DEFAULT NULL,
    FOREIGN KEY(climb_uuid) REFERENCES climbs(uuid) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY(climb_uuid)
);

-- Copy the data from the old table to the new table
INSERT INTO climb_cache_fields_new (climb_uuid, ascensionist_count, display_difficulty, quality_average)
SELECT climb_uuid, ascensionist_count, display_difficulty, quality_average
FROM climb_cache_fields;

-- Drop the old table
DROP TABLE climb_cache_fields;

-- Rename the new table to the original name
ALTER TABLE climb_cache_fields_new RENAME TO climb_cache_fields;

DROP TABLE IF EXISTS climb_stats_new;
-- Now do the same for climb_stats
-- Create a new table for climb_stats with regular FLOAT columns
CREATE TABLE climb_stats_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    climb_uuid TEXT NOT NULL,
    angle INTEGER NOT NULL,
    display_difficulty FLOAT DEFAULT NULL,
    benchmark_difficulty FLOAT DEFAULT NULL,
    ascensionist_count INTEGER NOT NULL,
    difficulty_average FLOAT DEFAULT NULL,
    quality_average FLOAT DEFAULT NULL,
    fa_username TEXT NOT NULL,
    fa_at TIMESTAMP NOT NULL
);

-- Copy the data from the old table to the new table
INSERT INTO climb_stats_new (climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at)
SELECT climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at
FROM climb_stats;

-- Drop the old table
DROP TABLE climb_stats;

-- Rename the new table to the original name
ALTER TABLE climb_stats_new RENAME TO climb_stats;

PRAGMA foreign_keys = ON;
EOF