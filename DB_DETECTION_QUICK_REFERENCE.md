# Database Detection Quick Reference

## Quick Start

```bash
npm run detect:db
```

## One-Line Detection Queries

Copy and paste these into your SQL Editor:

### PostgreSQL
```sql
SELECT version();
```

### MySQL/MariaDB
```sql
SELECT VERSION();
```

### SQLite
```sql
SELECT sqlite_version();
```

### SQL Server
```sql
SELECT @@VERSION;
```

## This Project Uses

**Database:** PostgreSQL (via Supabase)
**Connection:** See `.env` file
**Migrations:** `supabase/migrations/`
**Admin UI:** Supabase Dashboard

## Quick Access

### Supabase Dashboard
- URL: Check `VITE_SUPABASE_URL` in `.env`
- Project: Check `VITE_SUPABASE_PROJECT_ID` in `.env`
- Access: Settings → Database → SQL Editor

### Local Commands
```bash
npm run migrate:status    # Check migrations
npm run migrate:apply     # Apply pending migrations
npm run detect:db         # Run full diagnostic
```

## SQL Files Location

Main fix script:
```
./LOVABLE_FIX_ALL_TABLES.sql
```

Detection queries:
```
./db/detection-queries/
├── postgres-detection.sql
├── mysql-detection.sql
├── sqlite-detection.sql
└── sqlserver-detection.sql
```

Migrations:
```
./supabase/migrations/
```

## Common Tasks

### Run a Detection Query
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run: `SELECT version();`

### Find All SQL Files
```bash
find . -name "*.sql" | grep -v node_modules
```

### Check Database Connection
```bash
grep SUPABASE .env
```

## Full Documentation

- [DATABASE_DETECTION_GUIDE.md](./DATABASE_DETECTION_GUIDE.md) - Complete guide
- [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md) - SQL editing
- [db/detection-queries/README.md](./db/detection-queries/README.md) - Query reference

## Need Help?

1. Run: `npm run detect:db`
2. Review output for database type
3. Use appropriate detection SQL file
4. Check [DATABASE_DETECTION_GUIDE.md](./DATABASE_DETECTION_GUIDE.md) for details
