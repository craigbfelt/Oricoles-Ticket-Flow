# Database Detection & Diagnostic Guide

This guide helps you identify your database type, version, and locate SQL files using a comprehensive 8-step approach.

## Quick Start

Run the automated diagnostic tool:

```bash
npm run detect:db
```

Or directly:

```bash
./scripts/detect-database.sh
```

## What This Tool Does

The database detection script performs all 8 steps outlined below:

### Step 1 — Quick Check: Lovable Admin UI / SQL Editor

**Manual Steps:**
1. Open Lovable as an admin
2. Navigate to: Settings / Admin / Database / Connection or Integrations
3. Look for connection strings or database type indicators
4. Check SQL Editor for saved scripts or "Saved Queries"
5. If available, run detection queries directly in the SQL Editor

### Step 2 — Read-Only Database Detection Queries

Run these safe, read-only queries in your SQL Editor:

**PostgreSQL:**
```sql
SELECT version();
SELECT current_database(), current_user;
SELECT inet_server_addr(), inet_server_port();
```

**MySQL / MariaDB:**
```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'version%';
SELECT DATABASE(), USER();
```

**SQLite:**
```sql
SELECT sqlite_version();
PRAGMA database_list;
```

**SQL Server:**
```sql
SELECT @@VERSION;
```

The result will show the engine name and version (e.g., "PostgreSQL 15.2" or "MariaDB 10.6").

### Step 3 — Configuration File Inspection

The script automatically searches for:

- `.env` files
- `config/*.yml`, `config/*.json` files
- `database.yml`, `application.conf`
- Connection string patterns

**Connection String Examples:**
- `postgresql://user:pass@host:5432/dbname` → PostgreSQL
- `mysql://user:pass@host:3306/dbname` → MySQL/MariaDB/Percona
- `sqlite:///path/to/db.sqlite` → SQLite
- `mssql://user:pass@host:1433/dbname` → SQL Server

### Step 4 — Docker / Kubernetes Inspection

For containerized deployments:

**Docker:**
```bash
docker ps
docker exec -it <container> env | grep -i DB
docker exec -it <container> bash -c "grep -Rni 'DATABASE_URL|DB_HOST' /app"
```

**Kubernetes:**
```bash
kubectl get pods
kubectl exec -it <pod> -- env | grep -i DB
kubectl exec -it <pod> -- ls /app
```

### Step 5 — SQL File Search

The script searches for:

- `LOVABLE_FIX_ALL_TABLES.sql` (specifically)
- All `.sql` files in the repository
- Common SQL directories (`sql/`, `db/migrations/`, `supabase/migrations/`)

**Manual Search:**
```bash
# In repository
git ls-files '*.sql'
find . -type f -name "*.sql"

# On server
sudo find / -type f -iname "*.sql" 2>/dev/null
```

### Step 6 — Direct Database Connection

Test direct connections using database clients:

**PostgreSQL:**
```bash
PGPASSWORD=yourpass psql -h host -p 5432 -U user -d dbname -c "SELECT version();"
```

**MySQL:**
```bash
MYSQL_PWD=yourpass mysql -h host -P 3306 -u user -e "SELECT VERSION();"
```

**SQLite:**
```bash
sqlite3 /path/to/db.sqlite "SELECT sqlite_version();"
```

### Step 7 — MySQL Variant Detection

Distinguish between MySQL, MariaDB, and Percona by examining the version string:

- Contains **"MariaDB"** → MariaDB
- Contains **"Percona Server"** → Percona Server
- Otherwise contains **"MySQL"** → MySQL

**Example Version Strings:**
- `5.7.33-0ubuntu0.18.04.1` → MySQL
- `10.6.7-MariaDB-1:10.6.7+maria~focal` → MariaDB
- `8.0.26-17 Percona Server` → Percona

### Step 8 — Web-Access Only Fallback

If you only have web access and cannot execute SQL:

1. Check application documentation or "About" pages
2. Contact Lovable support or your administrator
3. Request:
   - Database engine and version
   - Location of SQL script storage
   - API access for listing/exporting SQL files

## For This Repository

This repository uses **Supabase**, which is PostgreSQL-based.

### Quick Facts:
- **Database Type:** PostgreSQL (via Supabase)
- **Configuration:** `.env` file
- **SQL Files:** Located in `supabase/migrations/`
- **Key Files:**
  - `LOVABLE_FIX_ALL_TABLES.sql` - Main fix script
  - `supabase/migrations/*.sql` - Database migrations

### Accessing Your Database:

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run queries directly

2. **Via Local Tools:**
   ```bash
   # Using the migration tools
   npm run migrate:status
   npm run migrate:apply
   
   # Direct connection (if you have credentials)
   psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   ```

3. **Environment Variables:**
   Check `.env` file for:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PROJECT_ID` - Your project ID
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key

## Troubleshooting

### Can't find database type?
1. Run the detection script: `npm run detect:db`
2. Check `.env` file for connection strings
3. Look for `supabase/`, `prisma/`, or `sequelize/` directories
4. Search for `package.json` database dependencies

### Can't access SQL Editor?
1. Check if you have admin permissions in Lovable
2. Try accessing Supabase dashboard directly
3. Use local migration tools: `npm run migrate:status`

### SQL files not found?
1. Check `supabase/migrations/` directory
2. Look for `db/`, `database/`, or `sql/` directories
3. Search with: `find . -name "*.sql"`

## Additional Resources

- [Lovable SQL Editing Guide](./LOVABLE_SQL_EDITING_GUIDE.md)
- [Lovable SQL Cheatsheet](./LOVABLE_SQL_CHEATSHEET.md)
- [Supabase Migrations Guide](./SUPABASE_MIGRATIONS.md)
- [Quick Start Guide](./QUICKSTART.md)

## Support

If you're unable to determine your database type:

1. Run the detection script and save the output
2. Contact your system administrator with the output
3. Check with Lovable support for SQL Editor access
4. Review application documentation for database requirements
