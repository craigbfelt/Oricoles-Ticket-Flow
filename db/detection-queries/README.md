# Database Detection Queries

This directory contains SQL query files for detecting and identifying different database types.

## Files

- **postgres-detection.sql** - PostgreSQL detection queries
- **mysql-detection.sql** - MySQL, MariaDB, and Percona detection queries
- **sqlite-detection.sql** - SQLite detection queries  
- **sqlserver-detection.sql** - SQL Server (MSSQL) detection queries

## Usage

### In Lovable SQL Editor

1. Open your Lovable project
2. Navigate to the SQL Editor
3. Open the appropriate detection file for your suspected database type
4. Copy and paste the queries
5. Execute them to get database information

### In Supabase Dashboard

For this project (which uses Supabase/PostgreSQL):

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Use the queries from `postgres-detection.sql`
4. Run them to verify your PostgreSQL setup

## Quick Detection

If you don't know which database you're using, try these single-line queries:

**PostgreSQL:**
```sql
SELECT version();
```

**MySQL/MariaDB:**
```sql
SELECT VERSION();
```

**SQLite:**
```sql
SELECT sqlite_version();
```

**SQL Server:**
```sql
SELECT @@VERSION;
```

## Understanding Results

### PostgreSQL
- Result contains "PostgreSQL" and version number
- For Supabase: Look for auth, storage schemas

### MySQL Variants
- Contains "MariaDB" → MariaDB
- Contains "Percona Server" → Percona
- Otherwise "MySQL" → MySQL

### SQLite
- Returns version like "3.36.0"
- Usually single-file embedded database

### SQL Server
- Contains "Microsoft SQL Server"
- Shows edition and version

## Additional Resources

See [DATABASE_DETECTION_GUIDE.md](../../DATABASE_DETECTION_GUIDE.md) for comprehensive instructions on all detection methods.
