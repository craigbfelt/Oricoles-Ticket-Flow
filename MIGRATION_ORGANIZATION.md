# Migration Organization Guide

## Overview

Database migrations in this project are organized through a **tab-based UI system** in the Migrations page, while all physical SQL files remain in a single directory for compatibility with Supabase CLI and deployment tooling.

## Migration Status Categories

### 1. Unapplied Migrations
- **Location in UI**: "Unapplied Migrations" tab
- **Description**: Migrations that need to be run on the database
- **Features**:
  - Red badge showing count of pending migrations
  - Selection checkboxes for bulk operations
  - "Mark Applied" buttons for each migration
  - Quick access to SQL content

### 2. Applied Migrations
- **Location in UI**: "Applied Migrations" tab
- **Description**: Migrations successfully applied to the database
- **Features**:
  - Green checkmark badges
  - Timestamp of when each was applied
  - View-only access to SQL content
  - Historical record of database changes

### 3. All Migrations
- **Location in UI**: "All Migrations" tab
- **Description**: Complete chronological list of all migrations
- **Features**:
  - Mixed view of applied and pending migrations
  - Order numbers for sequence tracking
  - Full migration history

## Physical File Organization

All migration SQL files are stored in:
```
/supabase/migrations/*.sql
```

### Why Single Directory?

1. **Supabase CLI Compatibility**: The Supabase CLI expects migrations in a single directory
2. **Deployment Automation**: CI/CD pipelines look for migrations in the standard location
3. **Git History**: Moving files would break the Git history and blame functionality
4. **Migration Ordering**: Timestamp-based filenames ensure correct execution order

## How Migration Status is Tracked

Migration status is tracked in the `schema_migrations` table:

```sql
CREATE TABLE public.schema_migrations (
  version text PRIMARY KEY,              -- Migration filename (without .sql extension)
  applied_at timestamptz DEFAULT now()   -- Timestamp of application
);
```

### Status Determination

- **Applied**: Migration version exists in `schema_migrations` table
- **Unapplied**: Migration file exists but version not in `schema_migrations` table

## Using the Migration System

### Viewing Migration Status

1. Navigate to the **Migrations** page in the dashboard
2. Select the appropriate tab:
   - **Unapplied Migrations** - Focus on pending work
   - **Applied Migrations** - Review completed migrations
   - **All Migrations** - See complete history

### Applying Migrations

#### Single Migration
1. Go to "Unapplied Migrations" tab
2. Click "View SQL" on the migration
3. Copy the SQL content
4. Run in Supabase SQL Editor
5. Click "Mark Applied" to record completion

#### Bulk Migrations
1. Go to "Unapplied Migrations" tab
2. Select checkboxes for migrations to apply
3. Click "Mark X as Applied" button
4. Or use "Select All Pending" to mark all at once

### Best Practices

1. **Always apply migrations in order** - The order number indicates the correct sequence
2. **Test in development first** - Apply to dev environment before production
3. **Review SQL before applying** - Use "View SQL" to understand changes
4. **Mark only after successful application** - Don't mark as applied if SQL failed
5. **Keep documentation updated** - Document any manual steps needed

## Migration File Naming Convention

Migrations follow this pattern:
```
YYYYMMDDHHMMSS_description.sql
```

Example:
```
20251100000000_create_schema_migrations_table.sql
20251208110600_fix_network_diagrams_schema.sql
```

- **Timestamp prefix** ensures chronological ordering
- **Descriptive name** explains the migration purpose
- **.sql extension** identifies it as a SQL migration file

## Troubleshooting

### Migration Shows as Unapplied After Marking

**Cause**: The migration marking function may not have completed successfully.

**Solution**:
1. Check browser console for errors
2. Verify the edge function `mark-migrations-applied` is deployed
3. Manually insert into `schema_migrations` table:
   ```sql
   INSERT INTO schema_migrations (version) 
   VALUES ('migration_filename_without_sql_extension')
   ON CONFLICT (version) DO NOTHING;
   ```
4. Refresh the Migrations page

### All Migrations Show as Unapplied

**Cause**: The `schema_migrations` table may not exist.

**Solution**:
1. Run the first migration: `20251100000000_create_schema_migrations_table.sql`
2. This creates the tracking table
3. Refresh the Migrations page

### Can't Find a Migration File

**Cause**: Migration may not be included in the build.

**Solution**:
1. Check that the file exists in `/supabase/migrations/`
2. Ensure the file has `.sql` extension
3. Rebuild the application: `npm run build`
4. The migration files are bundled at build time

## Migration Lifecycle

```
┌─────────────────────┐
│  New Migration      │
│  Created in Git     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Shows in           │
│  "Unapplied" Tab    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Developer Reviews  │
│  and Runs SQL       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Marked as Applied  │
│  (Manual or Button) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Moves to           │
│  "Applied" Tab      │
└─────────────────────┘
```

## Advanced: Creating New Migrations

To create a new migration:

1. **Using Supabase CLI** (Recommended):
   ```bash
   supabase migration new description_of_change
   ```

2. **Manual Creation**:
   - Create file in `/supabase/migrations/`
   - Use timestamp format: `YYYYMMDDHHMMSS_description.sql`
   - Write your SQL changes
   - Commit to Git

3. **Testing**:
   - Apply to local Supabase instance
   - Verify changes work as expected
   - Mark as applied in tracking table

4. **Deployment**:
   - Push to Git repository
   - Migration appears in "Unapplied" tab
   - Apply to production following the standard process

## Related Documentation

- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Migration Management Page](src/pages/Migrations.tsx)
- [Edge Function: mark-migrations-applied](supabase/functions/mark-migrations-applied/index.ts)

## Support

If you encounter issues with migrations:

1. Check the "Unapplied Migrations" tab for pending work
2. Review the SQL content before applying
3. Verify edge functions are deployed
4. Check database logs in Supabase dashboard
5. Contact the development team for assistance
