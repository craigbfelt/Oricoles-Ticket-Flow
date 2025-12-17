# Automation Guide - Supabase Edge Functions & Database Migrations

## Overview

This guide explains how the Oricol Ticket Flow system **automatically deploys** database migrations and edge functions to Supabase using GitHub Actions. Everything is already configured and working!

## ✅ What's Already Automated

### 1. Database Migrations (Fully Automatic)

**Triggers automatically when:**
- You push changes to `supabase/migrations/` directory on the `main` branch
- A migration file is added, modified, or deleted

**What it does:**
1. Detects migration changes
2. Links to your Supabase project
3. Applies all pending migrations via `supabase db push`
4. Verifies migrations were applied successfully
5. Posts a commit comment with success/failure status

**Workflow File:** `.github/workflows/deploy-migrations.yml`

**Manual Trigger:** You can also manually trigger migrations via GitHub Actions UI

### 2. Edge Functions (Automatic on Change)

**Triggers automatically when:**
- You push changes to any file under `supabase/functions/` on the `main` branch
- Only **changed functions** are deployed (efficient!)

**What it does:**
1. Detects which functions changed
2. Extracts unique function names from changed files
3. Configures Supabase CLI
4. Deploys only the changed functions
5. Reports success/failure per function

**Workflow File:** `.github/workflows/deploy-changed-edge-functions.yml`

### 3. Deploy All Edge Functions (Manual with Safety)

**Use when:**
- Initial setup of a new Supabase project
- Need to redeploy all functions after configuration changes
- Troubleshooting deployment issues

**Safety Feature:** 
- Requires typing "deploy" to confirm (prevents accidental runs)

**What it does:**
1. Discovers all edge functions in `supabase/functions/`
2. Excludes `_shared` directory
3. Deploys each function sequentially
4. Reports which succeeded and which failed
5. Provides deployment summary

**Workflow File:** `.github/workflows/deploy-all-edge-functions.yml`

## 🔧 Required GitHub Secrets

These secrets must be configured in your GitHub repository for automation to work:

### Supabase Secrets

| Secret Name | Description | How to Get It | Required For |
|-------------|-------------|---------------|--------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Account → Access Tokens → Generate new token | All workflows |
| `SUPABASE_DB_PASSWORD` | Database password for migrations | Set during Supabase project creation, or reset in Database Settings | Migrations only |
| `SUPABASE_PROJECT_REF` | Project reference ID | From project URL or `supabase/config.toml` | Edge functions (optional) |

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

## 📋 Deployment Workflows Explained

### Workflow 1: Database Migrations

```yaml
# File: .github/workflows/deploy-migrations.yml

Trigger:
  - Push to main when supabase/migrations/** changes
  - Manual dispatch (workflow_dispatch)

Steps:
  1. Checkout repository
  2. Setup Node.js and Supabase CLI
  3. Link to Supabase project
  4. Check current migration status
  5. Apply migrations (supabase db push)
  6. Verify migrations applied
  7. Post commit comment with status
```

**Success Output:**
```
✅ Database migrations deployed successfully!
All pending migrations have been applied to the Supabase database.
```

**Failure Output:**
```
❌ Database migration deployment failed!
Please check the workflow logs for details and apply migrations manually if needed.
```

### Workflow 2: Changed Edge Functions

```yaml
# File: .github/workflows/deploy-changed-edge-functions.yml

Trigger:
  - Push to main (any change)

Steps:
  1. Checkout repository with full history
  2. Detect changed files since last commit
  3. Extract function names from changed paths
  4. Install Supabase CLI
  5. Configure Supabase authentication
  6. Deploy each changed function
  7. Report success/failure per function
```

**Example Output:**
```
Detected function slugs: sync-microsoft-365 endpoint-data-ingestion
Deploying functions: sync-microsoft-365 endpoint-data-ingestion
✅ Successfully deployed: sync-microsoft-365
✅ Successfully deployed: endpoint-data-ingestion
```

### Workflow 3: Deploy All Edge Functions

```yaml
# File: .github/workflows/deploy-all-edge-functions.yml

Trigger:
  - Manual only (workflow_dispatch)
  - Requires confirmation: type "deploy"

Steps:
  1. Verify user typed "deploy" to confirm
  2. Checkout repository
  3. Setup Node.js and Supabase CLI
  4. Link to Supabase project
  5. Find all edge function directories
  6. Deploy each function with --no-verify-jwt=false
  7. Track succeeded and failed deployments
  8. Create deployment summary
```

**How to Run:**
1. Go to **Actions** tab in GitHub
2. Select **Deploy All Edge Functions**
3. Click **Run workflow**
4. Type `deploy` in the confirmation field
5. Click **Run workflow**

## 🚀 Usage Examples

### Example 1: Adding a New Migration

```bash
# 1. Create a new migration locally
supabase migration new add_user_preferences_table

# 2. Write your SQL in the new migration file
# supabase/migrations/20231217120000_add_user_preferences_table.sql

# 3. Commit and push to main
git add supabase/migrations/
git commit -m "Add user preferences table migration"
git push origin main

# ✅ GitHub Actions automatically applies the migration!
```

### Example 2: Updating an Edge Function

```bash
# 1. Edit the function
# supabase/functions/sync-microsoft-365/index.ts

# 2. Commit and push to main
git add supabase/functions/sync-microsoft-365/
git commit -m "Update M365 sync to include new fields"
git push origin main

# ✅ GitHub Actions automatically deploys just this function!
```

### Example 3: Initial Setup (Deploy All Functions)

1. Navigate to your repository on GitHub
2. Click the **Actions** tab
3. Find **Deploy All Edge Functions** in the left sidebar
4. Click **Run workflow** (top right)
5. In the dropdown, type: `deploy`
6. Click the green **Run workflow** button
7. Wait 5-10 minutes for all 18 functions to deploy

### Example 4: Force Re-run Migrations

1. Navigate to **Actions** → **Deploy Database Migrations**
2. Click **Run workflow**
3. Optionally check "Force deploy all migrations"
4. Click **Run workflow**

## 📊 Monitoring Deployments

### GitHub Actions UI

**View Workflow Runs:**
1. Go to your repository
2. Click **Actions** tab
3. See all workflow runs with status (✅ success, ❌ failed, 🟡 in progress)
4. Click any run to see detailed logs

**Commit Comments:**
Migration workflows post comments directly on commits with deployment status.

### In the Dashboard

**Edge Function Tracker:**
- Navigate to `/edge-function-tracker` in the app
- See real-time deployment status of all 18 functions
- Check if functions are deployed or not deployed
- View required environment variables
- Access manual deployment commands

**Migration Tracker:**
- Navigate to `/migration-tracker` in the app
- Track migration progress
- View migration history
- Manage migration configuration

## 🔍 Troubleshooting

### Migration Deployment Failed

**Common Causes:**
1. **Syntax error in SQL:** Check migration file for SQL errors
2. **Missing dependency:** Migration references non-existent table/column
3. **Permission issue:** Database password incorrect or expired
4. **Network timeout:** Supabase temporarily unreachable

**How to Fix:**
1. Check workflow logs for specific error
2. Fix the SQL in your migration file
3. Test locally: `supabase db reset` then `supabase db push`
4. Push the fix to trigger re-deployment

**Manual Recovery:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations manually
supabase db push
```

### Edge Function Deployment Failed

**Common Causes:**
1. **Missing SUPABASE_ACCESS_TOKEN:** Secret not configured in GitHub
2. **Invalid TypeScript:** Function has compile errors
3. **Missing dependencies:** Function imports missing packages
4. **Timeout:** Function is too large or network slow

**How to Fix:**
1. Check workflow logs for specific error
2. Fix TypeScript errors in the function
3. Test locally: `supabase functions serve function-name`
4. Deploy manually: `supabase functions deploy function-name`

**Manual Deployment:**
```bash
# Deploy single function
supabase functions deploy function-name

# Deploy with no JWT verification (testing)
supabase functions deploy function-name --no-verify-jwt

# Check function logs
supabase functions logs function-name
```

### Workflow Not Triggering

**Checklist:**
- [ ] Changes pushed to `main` branch?
- [ ] File paths match workflow triggers?
- [ ] GitHub Actions enabled for repository?
- [ ] Secrets properly configured?
- [ ] Branch protection rules allowing workflows?

**Force Trigger:**
Use `workflow_dispatch` to manually trigger any workflow from GitHub Actions UI.

## 🎯 Best Practices

### Database Migrations

1. **Test Locally First:**
   ```bash
   supabase db reset  # Reset to clean state
   supabase db push   # Test migrations
   ```

2. **Write Idempotent Migrations:**
   ```sql
   -- Good: Won't fail if already exists
   CREATE TABLE IF NOT EXISTS users (...);
   
   -- Good: Safe column addition
   DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='new_field') THEN
       ALTER TABLE users ADD COLUMN new_field TEXT;
     END IF;
   END $$;
   ```

3. **Include Rollback Steps:**
   ```sql
   -- Migration up
   ALTER TABLE users ADD COLUMN status TEXT;
   
   -- To rollback manually if needed:
   -- ALTER TABLE users DROP COLUMN status;
   ```

4. **One Migration Per Feature:**
   - Don't bundle unrelated changes
   - Easier to debug and rollback
   - Clear migration history

### Edge Functions

1. **Test Before Pushing:**
   ```bash
   # Serve locally
   supabase functions serve function-name
   
   # Test with curl
   curl http://localhost:54321/functions/v1/function-name
   ```

2. **Use Environment Variables:**
   ```typescript
   // Don't hardcode secrets
   const apiKey = Deno.env.get('API_KEY');
   
   // Set in Supabase Dashboard → Edge Functions → Function → Settings
   ```

3. **Handle Errors Gracefully:**
   ```typescript
   try {
     // Function logic
   } catch (error) {
     console.error('Error:', error);
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { 'Content-Type': 'application/json' } }
     );
   }
   ```

4. **Log Important Events:**
   ```typescript
   console.log('Processing request:', { userId, action });
   // View logs: supabase functions logs function-name
   ```

### GitHub Actions

1. **Review Logs After Deployment:**
   - Always check workflow logs after push
   - Verify success/failure messages
   - Monitor for warnings

2. **Use Commit Messages Wisely:**
   ```bash
   # Good commit messages
   git commit -m "Add email notification migration"
   git commit -m "Fix authentication in sync-microsoft-365 function"
   
   # Bad commit messages
   git commit -m "update"
   git commit -m "fix"
   ```

3. **Monitor Workflow Quota:**
   - GitHub Actions has usage limits
   - Optimize workflows to reduce runtime
   - Consider self-hosted runners for large projects

## 🔐 Security Considerations

### Secrets Management

1. **Never Commit Secrets:**
   - Use GitHub Secrets for sensitive values
   - Add secrets to `.gitignore`
   - Rotate secrets regularly

2. **Limit Secret Access:**
   - Only give secrets to necessary workflows
   - Use environment-specific secrets for staging/production
   - Audit secret usage periodically

3. **Use Service Role Key Carefully:**
   - Only use `SUPABASE_SERVICE_ROLE_KEY` when necessary
   - Most functions should use `SUPABASE_ANON_KEY`
   - Service role bypasses RLS policies

### Function Security

1. **Verify JWT Tokens:**
   ```toml
   # supabase/config.toml
   [functions.my-function]
   verify_jwt = true  # Recommended for production
   ```

2. **Validate Input:**
   ```typescript
   if (!userId || typeof userId !== 'string') {
     return new Response('Invalid input', { status: 400 });
   }
   ```

3. **Use RLS Policies:**
   - Don't bypass RLS unless absolutely necessary
   - Test with real user tokens
   - Implement least-privilege access

## 📚 Additional Resources

### Official Documentation
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Project-Specific Guides
- [EDGE_FUNCTIONS_SETUP.md](./EDGE_FUNCTIONS_SETUP.md) - Detailed edge function setup
- [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md) - Migration setup guide
- [README.md](./README.md) - Project overview and setup

### Getting Help
- Check workflow logs in GitHub Actions
- Review Supabase function logs in dashboard
- Open an issue in the repository
- Contact the development team

## 🎉 Summary

**You have a fully automated deployment pipeline!**

✅ **Database migrations** deploy automatically when you push changes to `supabase/migrations/`

✅ **Edge functions** deploy automatically when you push changes to `supabase/functions/`

✅ **Manual workflows** available for initial setup and troubleshooting

✅ **Monitoring tools** in the dashboard to track deployment status

✅ **Safety mechanisms** to prevent accidental deployments (confirmation required for "deploy all")

**Next Steps:**
1. Verify GitHub Secrets are configured
2. Test automation by making a small change
3. Monitor the deployment in GitHub Actions
4. Check the dashboard trackers to verify status
5. Start building! 🚀

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained by:** Oricol ES Development Team
