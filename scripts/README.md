# Supabase Migration Scripts

This directory contains helper scripts to make managing Supabase migrations easier, especially when syncing between GitHub and Lovable.

## Available Scripts

### 1. `apply-migrations.sh` (Quick Apply - Recommended for Lovable)

**Purpose**: Quickly apply all pending migrations to your Supabase project.

**Usage**:
```bash
bash scripts/apply-migrations.sh
```

**Or using npm**:
```bash
npm run migrate
```

**What it does**:
- ✅ Checks for Supabase CLI
- ✅ Automatically links to your project (reads from `supabase/config.toml`)
- ✅ Shows migration status
- ✅ Applies all pending migrations
- ✅ Provides helpful feedback and next steps

**When to use**:
- After pulling changes from GitHub to Lovable
- First-time project setup
- When you see "new migrations available"

---

### 2. `migrate-supabase.sh` (Full Migration Helper)

**Purpose**: Comprehensive tool for all migration-related tasks.

**Usage**:
```bash
bash scripts/migrate-supabase.sh [command]
```

**Available Commands**:

| Command | Description | Example |
|---------|-------------|---------|
| `install` | Install Supabase CLI | `bash scripts/migrate-supabase.sh install` |
| `status` | Check migration status | `bash scripts/migrate-supabase.sh status` |
| `apply` | Apply migrations to remote | `bash scripts/migrate-supabase.sh apply` |
| `local` | Start local Supabase | `bash scripts/migrate-supabase.sh local` |
| `new [name]` | Create new migration | `bash scripts/migrate-supabase.sh new add_table` |
| `link` | Link to Supabase project | `bash scripts/migrate-supabase.sh link` |
| `reset` | Reset local database | `bash scripts/migrate-supabase.sh reset` |
| `help` | Show help message | `bash scripts/migrate-supabase.sh help` |

**When to use**:
- When you need more control over the migration process
- Creating new migrations
- Working with local Supabase
- Troubleshooting migration issues

---

## Quick Start Guide

### For Lovable Users (Most Common Use Case)

When you pull code from GitHub that includes new migrations:

```bash
npm run migrate
```

That's it! The script will guide you through the process.

### For Developers

**First-time setup**:
```bash
# 1. Link to your Supabase project
bash scripts/migrate-supabase.sh link

# 2. Apply all migrations
bash scripts/migrate-supabase.sh apply
```

**Creating new migrations**:
```bash
# Create a new migration file
bash scripts/migrate-supabase.sh new add_my_feature

# Edit the file in supabase/migrations/
# Then apply it
bash scripts/migrate-supabase.sh apply
```

**Local development**:
```bash
# Start local Supabase (requires Docker)
bash scripts/migrate-supabase.sh local

# Check status
bash scripts/migrate-supabase.sh status
```

---

## NPM Script Shortcuts

For convenience, these scripts are also available as npm scripts:

```bash
# Quick migration apply
npm run migrate

# Migration management
npm run migrate:status      # Check status
npm run migrate:apply       # Apply migrations
npm run migrate:new [name]  # Create new migration

# Supabase CLI
npm run supabase:start     # Start local Supabase
npm run supabase:stop      # Stop local Supabase
npm run supabase:status    # Check status
npm run supabase:link      # Link to project
```

---

## Troubleshooting

### "Permission denied" error

Make the scripts executable:
```bash
chmod +x scripts/migrate-supabase.sh
chmod +x scripts/apply-migrations.sh
```

### "Supabase CLI not found"

The scripts will automatically try to use `npx supabase`, which doesn't require installation.

If you want to install globally:
```bash
bash scripts/migrate-supabase.sh install
```

### "Not logged in" or authentication errors

Login to Supabase:
```bash
npx supabase login
```

This opens your browser for authentication.

### "Project not linked"

The scripts try to auto-link using the project ID in `supabase/config.toml`.

If that doesn't work, link manually:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find your project reference in the Supabase dashboard under Settings > General.

---

## Complete Documentation

For comprehensive migration documentation, see:
- **[SUPABASE_MIGRATIONS.md](../SUPABASE_MIGRATIONS.md)** - Complete guide to migrations
- **[LOCAL_SETUP.md](../LOCAL_SETUP.md)** - Local development setup
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Deployment options

---

## Script Features

### Auto-detection
- ✅ Automatically detects project ID from `supabase/config.toml`
- ✅ Checks if Supabase CLI is installed
- ✅ Uses `npx` if CLI is not globally installed

### User-friendly
- ✅ Color-coded output (info, success, warning, error)
- ✅ Interactive prompts for destructive operations
- ✅ Helpful error messages
- ✅ Clear instructions and next steps

### Safe
- ✅ Confirms before applying migrations
- ✅ Warns about destructive operations
- ✅ Provides status checks

---

## Examples

### Example 1: First-time setup
```bash
# Install Supabase CLI
bash scripts/migrate-supabase.sh install

# Link to your project
bash scripts/migrate-supabase.sh link

# Apply all migrations
bash scripts/migrate-supabase.sh apply
```

### Example 2: After pulling from GitHub
```bash
# Quick apply
npm run migrate
```

### Example 3: Creating a new feature
```bash
# Create migration
bash scripts/migrate-supabase.sh new add_notifications_table

# Edit the created file in supabase/migrations/
# Add your SQL

# Apply it
bash scripts/migrate-supabase.sh apply

# Commit to Git
git add supabase/migrations/
git commit -m "Add notifications table"
git push
```

### Example 4: Local development
```bash
# Start local Supabase
bash scripts/migrate-supabase.sh local

# This outputs:
# - API URL: http://localhost:54321
# - Studio URL: http://localhost:54323
# - Anon key: eyJ...

# Create .env.local with these values
# Then start the app
npm run dev
```

---

## Support

For help:
1. Run `bash scripts/migrate-supabase.sh help`
2. See [SUPABASE_MIGRATIONS.md](../SUPABASE_MIGRATIONS.md)
3. Check Supabase docs: https://supabase.com/docs/guides/cli

---

**Last Updated**: November 2025
