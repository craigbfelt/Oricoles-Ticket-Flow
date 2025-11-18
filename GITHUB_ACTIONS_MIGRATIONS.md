# GitHub Actions Database Migration Workflow

This guide explains how to apply pending Supabase database migrations using GitHub Actions when you don't have Lovable dashboard access or credits.

## Overview

The `.github/workflows/apply-migrations.yml` workflow allows you to apply database migrations directly from GitHub Actions to your Supabase project without needing local CLI access or Lovable dashboard credits.

## Prerequisites

Before using this workflow, you need to set up two GitHub repository secrets:

### Required Secrets

1. **SUPABASE_ACCESS_TOKEN**
   - Get from: https://supabase.com/dashboard/account/tokens
   - Steps:
     1. Log in to Supabase dashboard
     2. Click your profile icon (top right)
     3. Go to "Access Tokens"
     4. Click "Generate new token"
     5. Give it a name (e.g., "GitHub Actions")
     6. Copy the token (you won't see it again!)

2. **SUPABASE_DB_PASSWORD**
   - Get from: https://supabase.com/dashboard/project/{project-id}/settings/database
   - This is your database password (not your Supabase account password)
   - If you don't know it, you can reset it from the database settings page

### Setting Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add both secrets:
   - Name: `SUPABASE_ACCESS_TOKEN`, Value: (your token)
   - Name: `SUPABASE_DB_PASSWORD`, Value: (your database password)

## How to Use

### Running the Workflow

1. **Navigate to Actions tab**
   - Go to your GitHub repository
   - Click the **Actions** tab

2. **Select the workflow**
   - In the left sidebar, find "Apply DB migrations"
   - Click on it

3. **Run manually**
   - Click the **Run workflow** dropdown button (right side)
   - Select the branch (usually `main` or your current branch)
   - Click **Run workflow**

4. **Monitor progress**
   - The workflow will appear in the list
   - Click on it to see detailed logs
   - Watch for success/failure status

### What the Workflow Does

1. **Checks out your repository** - Gets the latest code including migration files
2. **Sets up Node.js** - Installs required runtime environment
3. **Installs Supabase CLI** - Gets the tool needed to apply migrations
4. **Verifies migrations directory** - Confirms migration files exist
5. **Links to Supabase project** - Connects to your Supabase database using the secrets
6. **Applies migrations** - Runs `supabase db push` to apply all pending migrations
7. **Reports results** - Shows success/failure and next steps

## Safety Best Practices

### Before Running Migrations

1. **Create a backup**
   - Go to Supabase Dashboard → Project → Database → Backups
   - Create a manual backup before applying migrations
   - This gives you a restore point if something goes wrong

2. **Test in staging first** (if available)
   - Apply migrations to a staging/development project first
   - Verify they work as expected
   - Then apply to production

3. **Review migration files**
   - Check `supabase/migrations/` directory
   - Review the SQL for destructive operations (DROP, TRUNCATE, DELETE)
   - Make sure you understand what each migration does

### After Running Migrations

1. **Verify in Supabase Dashboard**
   - Database → Tables: Check for new tables/columns
   - Database → Policies: Verify RLS policies were created
   - Check table structure matches expectations

2. **Test RLS enforcement**
   - Get your anon/public API key from Project Settings → API
   - Use Postman or curl to test endpoints
   - Example:
     ```bash
     curl -H "apikey: YOUR_ANON_KEY" \
          -H "Authorization: Bearer YOUR_ANON_KEY" \
          https://YOUR_PROJECT.supabase.co/rest/v1/YOUR_TABLE?select=*
     ```
   - Verify that data is properly filtered by RLS policies

3. **Test with authenticated users**
   - Create a test user in Auth → Users
   - Get an access token for that user
   - Test that users see only the data they should see

## Troubleshooting

### Common Issues

#### "SUPABASE_ACCESS_TOKEN secret is not set"
- Make sure you've added the secret to GitHub repository settings
- Check spelling exactly matches: `SUPABASE_ACCESS_TOKEN`
- The secret should be at the repository level, not environment level

#### "Could not find project_id in supabase/config.toml"
- Verify the `supabase/config.toml` file exists in your repository
- Check that it contains a line like: `project_id = "your-project-id"`

#### "Permission denied" or "Authentication failed"
- Verify your `SUPABASE_ACCESS_TOKEN` is valid
- Token may have expired - generate a new one
- Make sure `SUPABASE_DB_PASSWORD` is correct

#### "Migration failed: already exists"
- Some migrations may already be applied
- This is usually safe - the workflow will continue
- Check Supabase dashboard to verify schema state

#### Workflow doesn't appear
- Make sure the `.github/workflows/apply-migrations.yml` file is committed to the repository
- The file must be on the branch you're trying to run from
- Refresh the Actions page

## Alternative Methods

If GitHub Actions doesn't work for you, here are alternatives:

### Method 1: Direct SQL in Supabase Dashboard
See [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md) for how to copy migration SQL and run it in the SQL Editor.

### Method 2: Ask someone with CLI access
- Share the migration files from `supabase/migrations/`
- They can run: `npm run migrate`
- Or manually: `supabase db push`

### Method 3: Local CLI (if you have DB access)
```bash
# One-time setup
npm install
supabase link --project-ref YOUR_PROJECT_ID

# Apply migrations
npm run migrate
# or
supabase db push
```

## Migration File Format

Migrations are stored in `supabase/migrations/` with this naming pattern:
```
YYYYMMDDHHMMSS_description.sql
```

Example:
```
20251118105000_fix_rls_and_ntfs_permissions.sql
```

Each file contains SQL statements that will be executed in order.

## Security Notes

- Never commit `SUPABASE_ACCESS_TOKEN` or `SUPABASE_DB_PASSWORD` to the repository
- Use GitHub Secrets for sensitive values
- Tokens are masked in workflow logs
- Consider using environment-specific secrets for production vs. staging
- Regularly rotate your access tokens
- Use the principle of least privilege - the token only needs database migration permissions

## Next Steps After Migration

After successfully applying migrations:

1. **Update documentation** - If migrations changed the schema significantly
2. **Inform team members** - Let them know new features are available
3. **Monitor for issues** - Watch error logs in Supabase Dashboard
4. **Test critical workflows** - Verify key features still work
5. **Check performance** - New indexes/tables may affect query performance

## Related Documentation

- [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) - Complete migration guide
- [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md) - Quick start for migrations
- [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md) - Dashboard SQL editing
- [MIGRATION_MANAGER_GUIDE.md](./MIGRATION_MANAGER_GUIDE.md) - Using Migration Manager UI

## Support

If you encounter issues:

1. Check the workflow logs in GitHub Actions for detailed error messages
2. Review this guide for troubleshooting steps
3. Check Supabase Dashboard → Logs for database errors
4. Verify your secrets are set correctly
5. Create a GitHub issue with:
   - Error message from workflow logs
   - Migration file that failed (if applicable)
   - Steps you've already tried
