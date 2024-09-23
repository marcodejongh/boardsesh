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
