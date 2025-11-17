-- PostgreSQL Database Detection Queries
-- Run these queries in your SQL Editor to detect and verify PostgreSQL

-- Query 1: Get PostgreSQL version
SELECT version();

-- Query 2: Get current database and user information
SELECT 
    current_database() as database_name,
    current_user as current_user,
    session_user as session_user;

-- Query 3: Get server network information (if available)
SELECT 
    inet_server_addr() as server_ip,
    inet_server_port() as server_port;

-- Query 4: Get database size and settings
SELECT 
    pg_database.datname as database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) as size,
    pg_encoding_to_char(encoding) as encoding
FROM pg_database
WHERE datname = current_database();

-- Query 5: List all schemas
SELECT schema_name 
FROM information_schema.schemata
ORDER BY schema_name;

-- Query 6: Get PostgreSQL server uptime
SELECT 
    date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime;

-- Query 7: Check if this is a Supabase instance
-- (Look for Supabase-specific schemas/extensions)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') AND
             EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') AND
             EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault')
        THEN 'Supabase PostgreSQL'
        ELSE 'Standard PostgreSQL'
    END as postgres_type;

-- Expected Results:
-- - version() will contain "PostgreSQL" and the version number
-- - You should see your database name and current user
-- - For Supabase, you'll see additional Supabase-specific schemas
