# Database Verification Queries

This directory contains SQL queries that are used to verify the state of the database but are **not migrations**.

These queries should be run manually when needed to check database integrity, security, or to troubleshoot issues.

## Files

### verify_admin_roles.sql

**Purpose**: Verify admin role assignments and check for unauthorized privilege escalation.

**When to use**:
- After applying security-related migrations
- When auditing user access
- If you suspect unauthorized admin access

**How to run**:
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/sql)
2. Open this file
3. Copy the SQL content
4. Paste into SQL Editor
5. Click "Run" or press F5

**What it does**:
- Lists all users with admin role
- Shows when the role was assigned
- Helps identify suspicious admin assignments

## Important Notes

⚠️ **These are NOT migrations**
- Do not apply these as migrations
- They do not change the database schema
- They only query existing data

✅ **Safe to run multiple times**
- These queries only read data
- They do not modify anything
- Run them as often as needed

## Adding New Verification Queries

When adding new verification queries:
1. Create a new `.sql` file with a descriptive name
2. Add comments explaining:
   - What the query does
   - When to use it
   - What to look for in the results
3. Update this README with information about the new query
4. Do NOT use migration timestamp naming convention

## Related Documentation

- [AUTOMATED_MIGRATION_GUIDE.md](../../AUTOMATED_MIGRATION_GUIDE.md) - For database migrations
- [SUPABASE_MIGRATIONS.md](../../SUPABASE_MIGRATIONS.md) - Complete migration documentation

---

**Last Updated**: November 20, 2025
