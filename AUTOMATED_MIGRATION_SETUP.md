# Quick Setup: Automated Database Migrations

## 🎯 Goal
Enable automatic database migration deployment when you squash and merge PRs to main branch.

## ⚡ 5-Minute Setup

### Step 1: Get Your Supabase Access Token

1. Go to [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
2. Click **"Generate new token"**
3. Give it a name: `GitHub Actions - Migrations`
4. Click **"Generate token"**
5. **Copy the token** (you won't see it again!)

### Step 2: Get Your Database Password

1. Go to [Your Supabase Project Settings](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq/settings/database)
2. Find the **"Database password"** section
3. **Copy your password** (or reset it if you don't have it)

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

Add these two secrets:

**Secret 1:**
- Name: `SUPABASE_ACCESS_TOKEN`
- Value: The token you copied in Step 1
- Click **"Add secret"**

**Secret 2:**
- Name: `SUPABASE_DB_PASSWORD`
- Value: The password you copied in Step 2
- Click **"Add secret"**

### Step 4: Verify Setup

1. Go to **Actions** tab in your GitHub repo
2. Look for **"Deploy Database Migrations"** workflow
3. Click **"Run workflow"** dropdown
4. Select `main` branch
5. Click **"Run workflow"** button

If it runs successfully ✅, you're all set!

## ✨ How It Works Now

### Before (Manual Process)
1. ❌ Merge PR to main
2. ❌ Manually run migrations in Supabase SQL Editor
3. ❌ Hope you didn't forget any migrations
4. ❌ Hope you ran them in the right order

### After (Automated Process)
1. ✅ Squash and merge PR to main
2. ✅ GitHub Actions automatically applies migrations
3. ✅ All migrations applied in correct order
4. ✅ Success/failure notification on commit

## 🚀 Usage

### Creating New Migrations

```bash
# Create a new migration
npm run migrate:new add_new_feature

# Edit the generated file in supabase/migrations/

# Test locally (optional but recommended)
npm run migrate:apply

# Commit and push
git add .
git commit -m "Add migration for new feature"
git push
```

### Merging PRs

1. **Create PR** with your migration files
2. **Review** the migration SQL
3. **Squash and merge** the PR
4. **GitHub Actions automatically**:
   - Detects migration changes
   - Applies them to Supabase
   - Posts result as commit comment

### Checking Migration Status

View in GitHub Actions:
- Go to **Actions** tab
- Click on latest **"Deploy Database Migrations"** run
- View logs to see which migrations were applied

Or check locally:
```bash
npm run migrate:status
```

## 🔧 Troubleshooting

### "Authentication failed" Error

**Cause**: GitHub secrets are not set or incorrect

**Fix**:
1. Verify secrets are added: Settings → Secrets and variables → Actions
2. Check you have both `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`
3. If needed, regenerate and update the secrets

### "Migration failed" Error

**Cause**: SQL syntax error or dependency issue

**Fix**:
1. Check the workflow logs in GitHub Actions
2. Test the migration locally:
   ```bash
   npm run migrate:apply
   ```
3. Fix the SQL error
4. Commit and push the fix

### Manual Migration Application

If automated deployment fails, apply manually:

```bash
# Link to your project
npx supabase link --project-ref blhidceerkrumgxjhidq

# Apply migrations
npx supabase db push
```

Or use Supabase SQL Editor:
1. Open migration file in `supabase/migrations/`
2. Copy the SQL content
3. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq/sql)
4. Paste and run

## 📋 What Was Added

### New Files

1. **`.github/workflows/deploy-migrations.yml`**
   - Automated migration deployment workflow
   - Runs on push to main with migration changes
   - Requires Supabase secrets

2. **`AUTOMATED_MIGRATION_GUIDE.md`**
   - Complete guide for automated migrations
   - Best practices and troubleshooting
   - Advanced configuration options

3. **`AUTOMATED_MIGRATION_SETUP.md`** (this file)
   - Quick setup instructions
   - Step-by-step guide to enable automation

### Updated Files

1. **`.github/workflows/deploy-netlify.yml`**
   - Now waits for migrations to complete before deploying app
   - Ensures database is updated before new code goes live

## 🎓 Best Practices

1. **Test locally first**
   ```bash
   npm run supabase:start
   npm run migrate:apply
   # Test your app
   npm run supabase:stop
   ```

2. **Use idempotent SQL**
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   DROP TABLE IF EXISTS old_table;
   ```

3. **Small, focused migrations**
   - One feature per migration
   - Easier to review and debug

4. **Squash and merge**
   - Keeps history clean
   - Applies related migrations together

## 📚 Additional Resources

- **[AUTOMATED_MIGRATION_GUIDE.md](./AUTOMATED_MIGRATION_GUIDE.md)** - Complete automation guide
- **[SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)** - Full migration documentation
- **[MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)** - Quick start guide
- **[MIGRATION_CHEATSHEET.md](./MIGRATION_CHEATSHEET.md)** - Command reference

## ✅ Summary

**Setup Complete!**

Now when you:
1. Create a migration in `supabase/migrations/`
2. Commit and push to a branch
3. Create and merge a PR to main

**GitHub Actions will automatically**:
- Apply the migration to your Supabase database
- Verify it succeeded
- Notify you of the result

**No more manual migration deployment!** 🎉

---

**Last Updated**: November 20, 2025
**Status**: Ready to use after secrets are added
