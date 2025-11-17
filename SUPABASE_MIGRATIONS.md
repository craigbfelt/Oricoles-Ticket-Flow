# Supabase Migrations Guide

A comprehensive guide to managing Supabase SQL migrations when working with GitHub and Lovable.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Understanding Migrations](#understanding-migrations)
3. [Running Supabase CLI](#running-supabase-cli)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Lovable Users (After Pulling from GitHub)

When you pull code changes from GitHub to Lovable that include new migrations, run:

```bash
npm run migrate
```

This single command will:
- ✅ Check if Supabase CLI is installed
- ✅ Link to your Supabase project
- ✅ Apply all pending migrations
- ✅ Show you the results

**That's it!** Your database schema will be updated with the latest changes.

### Alternative: Manual Quick Apply

```bash
bash scripts/apply-migrations.sh
```

### For Developers (Working Locally)

```bash
# Start local Supabase (includes auto-migration)
npm run supabase:start

# Check migration status
npm run migrate:status

# Apply migrations to remote project
npm run migrate:apply
```

---

## Understanding Migrations

### What are Migrations?

Migrations are SQL files that describe changes to your database schema. They allow you to:
- Track database changes in version control (Git)
- Apply changes consistently across environments
- Roll back changes if needed
- Collaborate with team members on database structure

### Migration Files Location

All migrations are stored in:
```
supabase/migrations/
```

Example migration file:
```
20251108052000_bee9ee20-5a81-402a-bdd9-30cce8e8ecb7.sql
```

Format: `YYYYMMDDHHMMSS_unique-id.sql`

### How Migrations Work

1. **Creation**: When you make a database change, create a migration file
2. **Version Control**: Commit the migration file to Git
3. **Apply**: Run the migration on your database
4. **Track**: Supabase tracks which migrations have been applied
5. **Sync**: Other team members pull and apply the same migrations

---

## Running Supabase CLI

### Installation

The Supabase CLI can be run in three ways:

#### Option 1: NPM Scripts (Recommended)
```bash
# No installation needed! Uses npx automatically
npm run migrate
npm run supabase:start
npm run migrate:status
```

#### Option 2: Using NPX (No Installation)
```bash
npx supabase --version
npx supabase start
npx supabase db push
```

#### Option 3: Global Installation
```bash
# Install globally (one-time)
npm install -g supabase

# Then use directly
supabase --version
supabase start
```

### Using the Helper Scripts

We provide two helper scripts for easier migration management:

#### 1. Quick Apply Script (Recommended for Lovable)
```bash
bash scripts/apply-migrations.sh
```

**What it does:**
- Checks for Supabase CLI
- Links to your project
- Shows migration status
- Applies all pending migrations

**When to use:**
- After pulling changes from GitHub
- When you see "new migrations available"
- First-time project setup

#### 2. Full Migration Helper Script
```bash
bash scripts/migrate-supabase.sh [command]
```

**Available commands:**
```bash
# Install Supabase CLI
bash scripts/migrate-supabase.sh install

# Check migration status
bash scripts/migrate-supabase.sh status

# Apply migrations to remote
bash scripts/migrate-supabase.sh apply

# Start local Supabase
bash scripts/migrate-supabase.sh local

# Create new migration
bash scripts/migrate-supabase.sh new my_migration_name

# Link to project
bash scripts/migrate-supabase.sh link

# Show help
bash scripts/migrate-supabase.sh help
```

---

## Common Workflows

### Workflow 1: Pulling Changes from GitHub (Lovable Users)

**Scenario**: You're working on Lovable and someone committed new migrations to GitHub.

**Steps:**
1. Pull the latest code from GitHub in Lovable
2. Run the migration script:
   ```bash
   npm run migrate
   ```
3. Confirm when prompted
4. Done! Your database is updated

### Workflow 2: Creating a New Migration

**Scenario**: You need to add a new table or modify the schema.

**Steps:**
1. Create a new migration file:
   ```bash
   npm run migrate:new add_my_new_table
   ```
   
2. Edit the created file in `supabase/migrations/`:
   ```sql
   -- Example: supabase/migrations/20251117_add_my_new_table.sql
   CREATE TABLE my_new_table (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     name text NOT NULL,
     created_at timestamptz DEFAULT now()
   );
   ```

3. Apply the migration:
   ```bash
   npm run migrate:apply
   ```

4. Commit and push:
   ```bash
   git add supabase/migrations/
   git commit -m "Add my_new_table migration"
   git push
   ```

### Workflow 3: Local Development

**Scenario**: You want to develop and test locally without affecting production.

**Steps:**
1. Install Docker Desktop (required)

2. Start local Supabase:
   ```bash
   npm run supabase:start
   ```
   
   This outputs:
   ```
   API URL: http://localhost:54321
   Studio URL: http://localhost:54323
   anon key: eyJhbG...
   ```

3. Create `.env.local`:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-above>
   ```

4. Start the app:
   ```bash
   npm run dev
   ```

5. Access Supabase Studio (database UI):
   ```
   http://localhost:54323
   ```

6. Stop local Supabase when done:
   ```bash
   npm run supabase:stop
   ```

### Workflow 4: Checking Migration Status

**Scenario**: You want to see which migrations have been applied.

**Steps:**
```bash
# Quick status check
npm run migrate:status

# Or using the helper script
bash scripts/migrate-supabase.sh status
```

**Output shows:**
- ✅ Applied migrations (already run)
- ⏳ Pending migrations (need to be applied)

### Workflow 5: Linking to Your Supabase Project

**Scenario**: First-time setup or switching projects.

**Steps:**

1. Find your project reference in Supabase dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings > General
   - Copy "Reference ID"

2. Link using npm script:
   ```bash
   npm run supabase:link
   ```
   
3. Or use the helper script:
   ```bash
   bash scripts/migrate-supabase.sh link
   ```

4. Or link manually:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

---

## NPM Scripts Reference

Quick reference for all available migration-related npm scripts:

```bash
# Quick migration apply (interactive)
npm run migrate

# Show help for migration tools
npm run migrate:help

# Check migration status
npm run migrate:status

# Apply pending migrations
npm run migrate:apply

# Create new migration file
npm run migrate:new my_migration_name

# Start local Supabase
npm run supabase:start

# Stop local Supabase
npm run supabase:stop

# Check local Supabase status
npm run supabase:status

# Link to remote project
npm run supabase:link
```

---

## Troubleshooting

### Issue: "Supabase CLI not found"

**Solution 1**: Use NPX (no installation needed)
```bash
npx supabase --version
```

**Solution 2**: Install globally
```bash
npm install -g supabase
```

**Solution 3**: Use the helper script
```bash
bash scripts/migrate-supabase.sh install
```

### Issue: "Not logged in" or "Authentication required"

**Solution**: Login to Supabase
```bash
npx supabase login
```

This opens your browser for authentication.

### Issue: "Project not linked"

**Solution**: Link to your project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in Supabase Dashboard > Settings > General

### Issue: "Migration already exists" or "Duplicate migration"

**Solution**: Check migration status
```bash
npm run migrate:status
```

If a migration shows as already applied, you don't need to apply it again.

### Issue: "Docker not found" (for local development)

**Solution**: Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- After installation, restart your terminal
- Verify: `docker --version`

### Issue: "Permission denied" when running scripts

**Solution**: Make scripts executable
```bash
chmod +x scripts/migrate-supabase.sh
chmod +x scripts/apply-migrations.sh
```

### Issue: "Database migration failed"

**Solution**: Check the error message and:

1. Verify your database connection:
   ```bash
   npm run supabase:status
   ```

2. Check if there are syntax errors in the migration file

3. Ensure you have necessary permissions

4. Try running the SQL manually in Supabase Studio:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to SQL Editor
   - Paste and run the migration SQL

### Issue: "Migrations out of sync"

**Solution**: List and compare migrations
```bash
# Local migrations
ls -l supabase/migrations/

# Remote migrations
npm run migrate:status
```

If there's a mismatch, ensure you've pulled the latest code from Git.

---

## Best Practices

### ✅ DO:

1. **Always create migrations for schema changes**
   ```bash
   npm run migrate:new describe_your_change
   ```

2. **Test migrations locally first**
   ```bash
   npm run supabase:start
   npm run migrate:apply
   ```

3. **Commit migration files to Git**
   ```bash
   git add supabase/migrations/
   git commit -m "Add migration: description"
   ```

4. **Use descriptive migration names**
   ```bash
   # Good
   npm run migrate:new add_user_preferences_table
   
   # Bad
   npm run migrate:new update
   ```

5. **Run migrations in order**
   - Supabase automatically handles this
   - Never rename or reorder migration files

### ❌ DON'T:

1. **Don't edit applied migrations**
   - Create a new migration instead

2. **Don't manually modify the database**
   - Always use migrations
   - Makes changes reproducible

3. **Don't delete migration files**
   - Even old ones
   - They're part of your database history

4. **Don't skip migrations**
   - Apply them in order
   - Skipping can cause issues

---

## Advanced Topics

### Manual Migration Creation

If you prefer not to use the CLI:

1. Create a file in `supabase/migrations/`:
   ```
   20251117120000_my_migration.sql
   ```

2. Add your SQL:
   ```sql
   -- Description of changes
   CREATE TABLE example (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL
   );
   ```

3. Apply:
   ```bash
   npm run migrate:apply
   ```

### Running Specific Migrations

Supabase automatically runs only pending migrations. You can't skip or cherry-pick migrations.

### Rollback Migrations

Supabase doesn't have built-in rollback. To undo a migration:

1. Create a new migration that reverses the changes:
   ```bash
   npm run migrate:new rollback_previous_change
   ```

2. Add the reverse SQL:
   ```sql
   -- Reverse of previous migration
   DROP TABLE IF EXISTS example;
   ```

### Environment-Specific Migrations

For different environments (dev, staging, prod):

1. Use separate Supabase projects
2. Link to different projects:
   ```bash
   # Development
   npx supabase link --project-ref dev-project-id
   
   # Production
   npx supabase link --project-ref prod-project-id
   ```

---

## Getting Help

### Documentation Links

- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Migrations Guide**: https://supabase.com/docs/guides/cli/local-development#database-migrations
- **Supabase Dashboard**: https://supabase.com/dashboard

### Quick Commands

```bash
# Show all available commands
bash scripts/migrate-supabase.sh help

# Check CLI version
npx supabase --version

# Get help for specific command
npx supabase help
npx supabase migration help
npx supabase db help
```

### Local Development Help

For local development setup, see:
- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)

### Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review Supabase CLI documentation
3. Check migration file syntax
4. Create an issue in the project repository

---

## Summary

### Quick Command Reference

```bash
# Most common commands for Lovable users:
npm run migrate              # Apply migrations (guided)
npm run migrate:status       # Check what needs to be applied
npm run migrate:apply        # Apply pending migrations

# Creating new migrations:
npm run migrate:new add_feature    # Create new migration

# Local development:
npm run supabase:start      # Start local Supabase
npm run supabase:stop       # Stop local Supabase
npm run dev                 # Run the app

# Helper scripts:
bash scripts/apply-migrations.sh           # Quick apply
bash scripts/migrate-supabase.sh help      # Full help
```

### Typical Workflow

1. Pull latest code from GitHub
2. Run `npm run migrate`
3. Confirm when prompted
4. Continue developing

That's it! The scripts handle the complexity for you.

---

**Last Updated**: November 2025  
**For Questions**: See troubleshooting section or create an issue
