# Automated Database Migration Deployment Guide

## Overview

This repository now includes **automated database migration deployment** that runs whenever you merge a PR to the `main` branch. This ensures that database schema changes are automatically applied to your Supabase database without manual intervention.

## How It Works

### Automatic Deployment on PR Merge

1. **You make changes** to migration files in `supabase/migrations/`
2. **You create a PR** with your changes
3. **You squash and merge** the PR to `main` branch
4. **GitHub Actions automatically**:
   - Detects the migration changes
   - Installs Supabase CLI
   - Links to your Supabase project
   - Applies all pending migrations via `supabase db push`
   - Verifies the deployment
   - Posts a comment on the commit with the result

### Workflow Triggers

The migration deployment workflow runs when:
- **Push to main branch** with changes to `supabase/migrations/**` files
- **Manual trigger** via GitHub Actions UI (workflow_dispatch)

## Setup Requirements

### Required Secrets

To enable automated migrations, you need to add these secrets to your GitHub repository:

1. **SUPABASE_ACCESS_TOKEN**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
   - Generate a new access token
   - Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret

2. **SUPABASE_DB_PASSWORD**
   - This is your database password from your Supabase project
   - Go to [Supabase Project Settings](https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/settings/database)
   - Find the database password (or reset it if needed)
   - Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: Your Supabase access token
   - Click **Add secret**
5. Repeat for `SUPABASE_DB_PASSWORD`

## Usage

### Standard Workflow (Automated)

1. **Create a new migration**:
   ```bash
   npm run migrate:new my_new_feature
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Test locally** (optional but recommended):
   ```bash
   npm run migrate:apply
   ```

4. **Commit and push** to your branch:
   ```bash
   git add .
   git commit -m "Add migration for my_new_feature"
   git push origin your-branch
   ```

5. **Create a PR** on GitHub

6. **Review and merge** - Use "Squash and merge" to keep history clean

7. **Automatic deployment** - GitHub Actions will:
   - Detect the migration changes
   - Apply them to your Supabase database
   - Post a comment on the commit

### Manual Deployment

If you need to manually trigger migration deployment:

1. Go to GitHub Actions tab
2. Select "Deploy Database Migrations" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow" button

## Migration File Naming Convention

Migration files follow this format:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20251120120000_add_user_profiles.sql`

Always use the CLI to create new migrations to ensure proper timestamps:
```bash
npm run migrate:new description_here
```

## Best Practices

### 1. Test Migrations Locally First

Before merging to main, test your migrations locally:

```bash
# Start local Supabase
npm run supabase:start

# Apply migrations locally
npm run migrate:apply

# Verify everything works
# ... test your app ...

# Stop local Supabase when done
npm run supabase:stop
```

### 2. Use Idempotent SQL

Make your migrations safe to run multiple times:

```sql
-- Good: Using IF NOT EXISTS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL
);

-- Good: Checking before dropping
DROP TABLE IF EXISTS old_table;

-- Good: Conditional policy creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_select_policy'
  ) THEN
    CREATE POLICY users_select_policy ON users FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
```

### 3. Squash and Merge PRs

Use "Squash and merge" when merging PRs to:
- Keep main branch history clean
- Ensure all related migrations are applied together
- Make it easier to track what was deployed when

### 4. Small, Focused Migrations

Create small, focused migrations that do one thing:
- Easier to review
- Easier to debug if something goes wrong
- Easier to rollback if needed

### 5. Include Rollback Instructions

Add comments to your migrations explaining how to rollback:

```sql
-- Migration: Add user roles table
-- Rollback: DROP TABLE user_roles;

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL
);
```

## Troubleshooting

### Migration Deployment Failed

If the automated deployment fails:

1. **Check the workflow logs**:
   - Go to GitHub Actions tab
   - Click on the failed workflow run
   - Review the logs to see what went wrong

2. **Common issues**:
   - **Authentication failed**: Check if secrets are set correctly
   - **SQL syntax error**: Test the migration locally first
   - **Dependency error**: Ensure migrations run in the correct order
   - **Permission denied**: Check if database user has necessary permissions

3. **Manual recovery**:
   If automated deployment fails, you can apply migrations manually:
   ```bash
   # Clone the repo
   git clone <repo-url>
   cd <repo-name>
   
   # Install dependencies
   npm install
   
   # Link to Supabase
   npx supabase link --project-ref kwmeqvrmtivmljujwocp
   
   # Apply migrations
   npx supabase db push
   ```

### Check Migration Status

To see which migrations have been applied:

```bash
npm run migrate:status
```

Or check in Supabase:
```sql
SELECT * FROM schema_migrations ORDER BY version;
```

### Secrets Not Working

If you get authentication errors:

1. **Verify secrets are set**:
   - Go to GitHub Settings → Secrets and variables → Actions
   - Ensure both `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` exist

2. **Regenerate access token**:
   - Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
   - Delete old token
   - Generate new token
   - Update GitHub secret

3. **Verify database password**:
   - Go to Supabase Project Settings → Database
   - Reset password if needed
   - Update GitHub secret

## Advanced Features

### Force Deploy All Migrations

To force deploy all migrations (even those already applied):

1. Go to GitHub Actions
2. Select "Deploy Database Migrations"
3. Click "Run workflow"
4. Check "Force deploy all migrations"
5. Click "Run workflow"

**Warning**: This will attempt to re-run all migrations. Make sure your migrations are idempotent!

### Custom Migration Path

If you need to apply migrations from a specific path:

Edit `.github/workflows/deploy-migrations.yml` and modify the `paths` filter:

```yaml
on:
  push:
    branches: [ main ]
    paths:
      - 'supabase/migrations/**'
      - 'db/migrations/**'  # Add custom path
```

## Integration with Other Workflows

### Deploy Application After Migrations

The migration workflow runs independently but you can chain it with deployment:

1. Migration deployment completes
2. Application deployment starts (via existing deploy-*.yml workflows)
3. Application uses updated database schema

This is already configured in your repository - migrations deploy first, then the app.

## Monitoring and Notifications

### Commit Comments

The workflow automatically posts comments on commits:
- ✅ Success: "Database migrations deployed successfully!"
- ❌ Failure: "Database migration deployment failed!"

### Email Notifications

GitHub will email you if a workflow fails. Configure this in your GitHub notification settings.

## Security Considerations

1. **Never commit secrets** to the repository
2. **Use repository secrets** for sensitive data
3. **Restrict access** to migration workflows
4. **Review migrations** before merging
5. **Use RLS policies** in your migrations to secure data

## Related Documentation

- [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) - Complete migration guide
- [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md) - Quick start guide
- [MIGRATION_CHEATSHEET.md](./MIGRATION_CHEATSHEET.md) - Command reference
- [HOW_TO_RUN_MIGRATIONS_ON_LOVABLE.md](./HOW_TO_RUN_MIGRATIONS_ON_LOVABLE.md) - Lovable-specific guide

## Summary

✅ **Migrations are now automated**
- No more manual migration deployment
- Squash and merge PRs to deploy
- Automatic verification and notification

✅ **Safe and reliable**
- Only runs on main branch
- Requires authentication
- Posts deployment status

✅ **Easy to use**
- Create migration: `npm run migrate:new name`
- Test locally: `npm run migrate:apply`
- Merge PR: Automatic deployment

---

**Last Updated**: November 20, 2025
**Status**: ✅ Automated Migration Deployment Active
