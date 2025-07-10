#!/bin/bash

echo "🔧 Starting SQLite database cleanup for: $DB_FILE"

echo "📝 Step 1/4: Dropping triggers and starting transaction..."
sqlite3 $DB_FILE <<EOF
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Drop any triggers that depend on climb_cache_fields
-- The table names all in the triggers all start with "main." which is incorrect for the mobile app
DROP TRIGGER IF EXISTS climb_stats_after_insert;
DROP TRIGGER IF EXISTS climb_stats_after_update;
DROP TRIGGER IF EXISTS climb_stats_after_delete;
EOF

echo "🧹 Step 2/4: Cleaning up orphaned rows in all tables..."
sqlite3 $DB_FILE <<EOF
-- Clean up orphaned rows in product_sizes table where product_id no longer exists in products
DELETE FROM product_sizes
WHERE product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned rows in holes table where product_id or mirrored_hole_id no longer exists in products or holes
DELETE FROM holes
WHERE product_id NOT IN (SELECT product_id FROM products);
UPDATE holes SET mirrored_hole_id = NULL WHERE mirrored_hole_id = 0;

-- Clean up orphaned rows in leds table where product_size_id or hole_id no longer exists
DELETE FROM leds
WHERE product_size_id NOT IN (SELECT id FROM product_sizes)
   OR hole_id NOT IN (SELECT id FROM holes);

-- Clean up orphaned rows in products_angles table where product_id no longer exists
DELETE FROM products_angles
WHERE product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned rows in layouts table where product_id no longer exists
DELETE FROM layouts
WHERE product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned rows in product_sizes_layouts_sets where product_size_id, layout_id, or set_id no longer exists
DELETE FROM product_sizes_layouts_sets
WHERE product_size_id NOT IN (SELECT id FROM product_sizes)
   OR layout_id NOT IN (SELECT id FROM layouts)
   OR set_id NOT IN (SELECT id FROM sets);

-- Clean up orphaned rows in placement_roles where product_id no longer exists
DELETE FROM placement_roles
WHERE product_id NOT IN (SELECT id FROM products);

-- Clean up orphaned rows in user_syncs where user_id no longer exists in users
DELETE FROM user_syncs
WHERE user_id NOT IN (SELECT id FROM users);

-- Clean up orphaned rows in walls_sets where wall_uuid or set_id no longer exists in walls or sets
DELETE FROM walls_sets
WHERE wall_uuid NOT IN (SELECT uuid FROM walls)
   OR set_id NOT IN (SELECT id FROM sets);

-- Clean up orphaned rows in climb_cache_fields where climb_uuid no longer exists in climbs
DELETE FROM climb_cache_fields
WHERE climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in climb_stats where climb_uuid no longer exists in climbs
DELETE FROM climb_stats
WHERE climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in tags where entity_uuid or user_id no longer exists in the referenced tables
DELETE FROM tags
WHERE entity_uuid NOT IN (SELECT uuid FROM climbs)  -- Adjust this if entity_uuid refers to another table
   OR user_id NOT IN (SELECT id FROM users);

-- Clean up orphaned rows in circuits_climbs where circuit_uuid or climb_uuid no longer exists
DELETE FROM circuits_climbs
WHERE circuit_uuid NOT IN (SELECT uuid FROM circuits)
   OR climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in bids where user_id or climb_uuid no longer exists
DELETE FROM bids
WHERE user_id NOT IN (SELECT id FROM users)
   OR climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in ascents where user_id, climb_uuid, or difficulty no longer exists
DELETE FROM ascents
WHERE user_id NOT IN (SELECT id FROM users)
   OR climb_uuid NOT IN (SELECT uuid FROM climbs)
   OR difficulty NOT IN (SELECT difficulty FROM difficulty_grades);

-- Clean up orphaned rows in placements where layout_id, hole_id, or set_id no longer exists
DELETE FROM placements
WHERE layout_id NOT IN (SELECT id FROM layouts)
   OR hole_id NOT IN (SELECT id FROM holes)
   OR set_id NOT IN (SELECT id FROM sets);

-- Clean up orphaned rows in walls where product_id, layout_id, or product_size_id no longer exists
DELETE FROM walls
WHERE product_id NOT IN (SELECT id FROM products)
   OR layout_id NOT IN (SELECT id FROM layouts)
   OR product_size_id NOT IN (SELECT id FROM product_sizes);

-- Clean up orphaned rows in beta_links where climb_uuid no longer exists in climbs
DELETE FROM beta_links
WHERE climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in climb_random_positions where climb_uuid no longer exists
DELETE FROM climb_random_positions
WHERE climb_uuid NOT IN (SELECT uuid FROM climbs);

-- Clean up orphaned rows in circuits where user_id no longer exists in users
DELETE FROM circuits
WHERE user_id NOT IN (SELECT id FROM users);

-- Clean up orphaned rows in placements where default_placement_role_id no longer exists in placement_roles
DELETE FROM placements
WHERE default_placement_role_id IS NOT NULL 
   AND default_placement_role_id NOT IN (SELECT id FROM placement_roles);

-- Clean up orphaned rows in walls where user_id no longer exists in users
DELETE FROM walls
WHERE user_id NOT IN (SELECT id FROM users);
EOF

echo "🔄 Step 3/4: Recreating climb_cache_fields table with proper FLOAT columns..."
sqlite3 $DB_FILE <<EOF
-- Create a new table for climb_cache_fields with regular FLOAT columns
DROP TABLE IF EXISTS climb_cache_fields_new;
CREATE TABLE climb_cache_fields_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    climb_uuid TEXT NOT NULL,
    ascensionist_count INT DEFAULT NULL,
    display_difficulty FLOAT DEFAULT NULL,
    quality_average FLOAT DEFAULT NULL,
    FOREIGN KEY(climb_uuid) REFERENCES climbs(uuid) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Copy the data from the old table to the new table
INSERT INTO climb_cache_fields_new (climb_uuid, ascensionist_count, display_difficulty, quality_average)
SELECT climb_uuid, ascensionist_count, display_difficulty, quality_average
FROM climb_cache_fields
WHERE climb_uuid IS NOT NULL;

-- Drop the old table
DROP TABLE climb_cache_fields;

-- Rename the new table to the original name
ALTER TABLE climb_cache_fields_new RENAME TO climb_cache_fields;
EOF

echo "🔄 Step 4/4: Recreating climb_stats table with proper FLOAT columns..."
sqlite3 $DB_FILE <<EOF
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
    fa_at TIMESTAMP NOT NULL,
    FOREIGN KEY(climb_uuid) REFERENCES climbs(uuid) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Copy the data from the old table to the new table
INSERT INTO climb_stats_new (climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at)
SELECT climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at
FROM climb_stats
WHERE climb_uuid IS NOT NULL;

-- Drop the old table
DROP TABLE climb_stats;

-- Rename the new table to the original name
ALTER TABLE climb_stats_new RENAME TO climb_stats;

COMMIT;

PRAGMA foreign_keys = ON;
EOF

echo "✅ SQLite database cleanup completed successfully!"
