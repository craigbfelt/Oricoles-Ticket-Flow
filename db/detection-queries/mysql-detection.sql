-- MySQL / MariaDB / Percona Detection Queries
-- Run these queries in your SQL Editor to detect the database type and version

-- Query 1: Get database version (most important)
SELECT VERSION();

-- Query 2: Show all version-related variables
SHOW VARIABLES LIKE 'version%';

-- Query 3: Get current database and user
SELECT DATABASE() as current_database, USER() as current_user;

-- Query 4: Get server information
SELECT 
    @@hostname as server_hostname,
    @@port as server_port,
    @@datadir as data_directory;

-- Query 5: Check server uptime
SELECT 
    @@version as version,
    @@version_comment as version_comment,
    @@version_compile_os as compile_os;

-- Query 6: Get database size
SELECT 
    table_schema as database_name,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables
WHERE table_schema = DATABASE()
GROUP BY table_schema;

-- Query 7: List all databases
SHOW DATABASES;

-- Query 8: Get character set information
SELECT 
    @@character_set_database as charset,
    @@collation_database as collation;

-- How to interpret the VERSION() result:
-- 
-- If VERSION() contains:
--   - "MariaDB" → You're using MariaDB
--     Example: "10.6.7-MariaDB-1:10.6.7+maria~focal"
--   
--   - "Percona" or "Percona Server" → You're using Percona Server
--     Example: "8.0.26-17 Percona Server (GPL), Release 17, Revision 07daeca2"
--   
--   - Otherwise contains "MySQL" → You're using MySQL
--     Example: "8.0.28-0ubuntu0.20.04.3"
