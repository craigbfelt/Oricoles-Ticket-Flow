-- SQLite Database Detection Queries
-- Run these queries in your SQLite database to get information

-- Query 1: Get SQLite version
SELECT sqlite_version() as sqlite_version;

-- Query 2: List all databases (attached databases)
PRAGMA database_list;

-- Query 3: Get compile options
PRAGMA compile_options;

-- Query 4: List all tables in the main database
SELECT name, type 
FROM sqlite_master 
WHERE type IN ('table', 'view')
ORDER BY type, name;

-- Query 5: Get database page size and other settings
PRAGMA page_size;
PRAGMA page_count;
PRAGMA encoding;

-- Query 6: Get database file size (in pages)
SELECT 
    page_count * page_size as database_size_bytes,
    ROUND(page_count * page_size / 1024.0 / 1024.0, 2) as database_size_mb
FROM (
    SELECT 
        (SELECT * FROM pragma_page_count) as page_count,
        (SELECT * FROM pragma_page_size) as page_size
);

-- Query 7: Check for common SQLite features
SELECT 
    sqlite_version() as version,
    sqlite_source_id() as source_id,
    sqlite_compileoption_used('THREADSAFE') as is_threadsafe,
    sqlite_compileoption_used('ENABLE_FTS5') as has_full_text_search;

-- Query 8: List all indexes
SELECT name, tbl_name, sql
FROM sqlite_master
WHERE type = 'index'
ORDER BY tbl_name, name;

-- Expected Results:
-- - sqlite_version() will return something like "3.36.0"
-- - database_list will show attached databases
-- - Most SQLite databases are single-file embedded databases
