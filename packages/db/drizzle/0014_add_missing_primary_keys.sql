-- Defensive migration to add missing primary key constraints for user sync tables
-- This ensures ON CONFLICT clauses work properly for upsert operations

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

-- Add primary key to kilter_shared_syncs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_shared_syncs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_shared_syncs ADD PRIMARY KEY (table_name);
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
        ALTER TABLE tension_shared_syncs ADD PRIMARY KEY (table_name);
    END IF;
END $$;

-- Add primary key to tension_beta_links if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_beta_links'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_beta_links ADD PRIMARY KEY (climb_uuid, link);
    END IF;
END $$;

-- Add primary key to kilter_beta_links if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_beta_links'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_beta_links ADD PRIMARY KEY (climb_uuid, link);
    END IF;
END $$;

-- Add primary key to tension_users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_users'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_users ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add primary key to kilter_users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_users'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_users ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add primary key to kilter_walls if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_walls'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_walls ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to tension_walls if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_walls'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_walls ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to kilter_ascents if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_ascents'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_ascents ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to tension_ascents if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_ascents'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_ascents ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to kilter_bids if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_bids'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_bids ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to tension_bids if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_bids'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_bids ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to kilter_circuits if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_circuits'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_circuits ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add primary key to tension_circuits if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_circuits'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_circuits ADD PRIMARY KEY (uuid);
    END IF;
END $$;

-- Add composite primary key to kilter_tags if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'kilter_tags'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE kilter_tags ADD PRIMARY KEY (entity_uuid, user_id, name);
    END IF;
END $$;

-- Add composite primary key to tension_tags if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'tension_tags'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE tension_tags ADD PRIMARY KEY (entity_uuid, user_id, name);
    END IF;
END $$;