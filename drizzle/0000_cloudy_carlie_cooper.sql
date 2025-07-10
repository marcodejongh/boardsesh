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

