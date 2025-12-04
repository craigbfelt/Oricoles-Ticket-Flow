# Automatic Database Migrations

This document explains how database migrations are automatically applied when you push code to GitHub.

## Overview

The system is configured for **fully automatic migrations**. When you:

1. Create a new migration file in `supabase/migrations/`
2. Commit and push to the `main` branch

The migrations are automatically applied to Supabase.

## How It Works

### GitHub Workflows

Two GitHub workflows handle automatic deployments:

#### 1. `deploy-migrations.yml`
- **Triggers**: When migration files change in `supabase/migrations/`
- **Action**: Applies pending migrations using `supabase db push`
- **Location**: `.github/workflows/deploy-migrations.yml`

#### 2. `deploy-vercel.yml`
- **Triggers**: Push to main branch
- **Action**: Applies migrations first, then deploys to Vercel
- **Location**: `.github/workflows/deploy-vercel.yml`

#### 3. `deploy-changed-edge-functions.yml`
- **Triggers**: When edge function files change
- **Action**: Deploys only the changed edge functions
- **Location**: `.github/workflows/deploy-changed-edge-functions.yml`

### Required GitHub Secrets

For automatic migrations to work, these secrets must be configured in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token (get from supabase.com dashboard) |
| `SUPABASE_DB_PASSWORD` | Your Supabase database password |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID |
| `VERCEL_TOKEN` | Your Vercel deployment token |
| `VERCEL_ORG_ID` | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |

### Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add each secret listed above

## Creating New Migrations

### Naming Convention

Migrations must follow this naming pattern:
```
YYYYMMDDHHMMSS_description.sql
```

Example:
```
20251204143000_add_user_preferences.sql
```

### Creating a Migration

1. Create a new `.sql` file in `supabase/migrations/`
2. Write your SQL migration
3. Commit and push to `main`

Example migration:
```sql
-- Migration: Add user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
```

## Checking Migration Status

### Via Edge Function

Call the `check-migrations` edge function to see which migrations are applied:

```javascript
const { data, error } = await supabase.functions.invoke('check-migrations');
console.log(data.summary); // { total: 70, applied: 70, pending: 0 }
```

### Via Supabase CLI

If you have the Supabase CLI installed locally:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
```

### Via GitHub Actions

Check the workflow run logs in GitHub Actions for migration status.

## Troubleshooting

### Migrations Not Running?

1. **Check GitHub Secrets**: Ensure all required secrets are configured
2. **Check Workflow Logs**: Go to GitHub Actions tab to see workflow runs
3. **Check Migration Files**: Ensure files are in `supabase/migrations/` directory
4. **Check File Names**: Ensure migration names follow the correct format

### Migration Failed?

1. Check the GitHub Actions workflow logs for error details
2. Common issues:
   - Syntax errors in SQL
   - Duplicate table/column names
   - Foreign key constraint violations
   - RLS policy conflicts

### Manual Migration Application

If automatic deployment fails, you can manually apply migrations:

1. Copy the SQL from your migration file
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL

## Architecture Diagram

```
┌─────────────────┐
│  GitHub Push    │
│  to main        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ deploy-vercel   │────▶│ Run Migrations  │
│ workflow        │     │ (supabase push) │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Deploy to       │     │ Apply to        │
│ Vercel          │     │ Supabase DB     │
└─────────────────┘     └─────────────────┘
```

## Edge Functions Deployment

Edge functions are automatically deployed when their files change:

1. Edit/create function in `supabase/functions/`
2. Commit and push to `main`
3. `deploy-changed-edge-functions.yml` workflow deploys only changed functions

## Summary

- ✅ Migrations run automatically on push to main
- ✅ Edge functions deploy automatically when changed
- ✅ Vercel deploys automatically after migrations complete
- ✅ Check migration status via edge function or CLI
- ✅ All you need to do is commit and push!
