-- Rename tables with kilter_ prefix
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public' 
        and tablename not like 'kilter_%'
        AND tablename not like 'tension_%'
        AND tablename not like 'boardsesh_%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident('kilter_' || r.tablename);
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) ||
                ' RENAME TO ' || quote_ident('kilter_' || r.tablename);
    END LOOP;
END $$;

-- Clean up SQLite autoindex constraints that may have been imported
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE conname LIKE '%sqlite_autoindex%'
        AND conrelid::regclass::text LIKE 'kilter_%'
    LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped SQLite constraint % from table %', r.conname, r.table_name;
    END LOOP;
END $$;
