-- SQL Server (MSSQL) Detection Queries
-- Run these queries in your SQL Server database

-- Query 1: Get SQL Server version (most comprehensive)
SELECT @@VERSION as version_info;

-- Query 2: Get detailed server properties
SELECT 
    SERVERPROPERTY('ProductVersion') as product_version,
    SERVERPROPERTY('ProductLevel') as product_level,
    SERVERPROPERTY('Edition') as edition,
    SERVERPROPERTY('EngineEdition') as engine_edition,
    SERVERPROPERTY('ServerName') as server_name;

-- Query 3: Get current database and user
SELECT 
    DB_NAME() as current_database,
    SUSER_SNAME() as current_user,
    SYSTEM_USER as system_user;

-- Query 4: Get database size
SELECT 
    database_name = DB_NAME(),
    database_size = CAST(SUM(size) * 8.0 / 1024 AS DECIMAL(10,2))
FROM sys.master_files
WHERE database_id = DB_ID()
GROUP BY database_id;

-- Query 5: List all databases
SELECT 
    name as database_name,
    state_desc as state,
    recovery_model_desc as recovery_model
FROM sys.databases
ORDER BY name;

-- Query 6: Get SQL Server uptime
SELECT 
    sqlserver_start_time as server_start_time,
    DATEDIFF(day, sqlserver_start_time, GETDATE()) as uptime_days
FROM sys.dm_os_sys_info;

-- Query 7: Get collation information
SELECT 
    SERVERPROPERTY('Collation') as server_collation,
    DATABASEPROPERTYEX(DB_NAME(), 'Collation') as database_collation;

-- Query 8: Check SQL Server edition features
SELECT 
    name as feature_name,
    value as is_enabled
FROM sys.configurations
WHERE name IN (
    'clr enabled',
    'xp_cmdshell',
    'remote access',
    'Database Mail XPs'
)
ORDER BY name;

-- Expected Results:
-- @@VERSION will contain:
-- - "Microsoft SQL Server" followed by version number
-- - Edition (Enterprise, Standard, Express, etc.)
-- - Build number and service pack level
--
-- Example: "Microsoft SQL Server 2019 (RTM) - 15.0.2000.5 (X64)"
