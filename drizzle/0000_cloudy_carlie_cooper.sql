-- Current sql file was generated after introspecting the database
-- Defensive migration to add missing primary key constraints

-- Add primary key to kilter_climbs.uuid if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'kilter_climbs' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_climbs ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to tension_climbs.uuid if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tension_climbs' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_climbs ADD PRIMARY KEY (uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_shared_syncs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_shared_syncs ADD PRIMARY KEY
(table_name);
    END IF;
END $$;

-- Add primary key to tension_shared_syncs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_shared_syncs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_shared_syncs ADD PRIMARY KEY
(table_name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_beta_links'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_beta_links_pkey ADD PRIMARY KEY (climb_uuid, link);
    END IF;
END $$;

-- Add primary key to tension_shared_syncs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_beta_links'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_shared_syncs ADD PRIMARY KEY (climb_uuid, link);
    END IF;
END $$;
