# Supabase Migration Cheat Sheet

Quick reference for common migration tasks.

## Most Common Commands

```bash
# Apply migrations (interactive, recommended)
npm run migrate

# Check what needs to be applied
npm run migrate:status

# Apply migrations (direct)
npm run migrate:apply

# Create new migration
npm run migrate:new my_feature_name
```

---

## Quick Workflows

### 1️⃣ After Pulling from GitHub
```bash
npm run migrate
# Answer "y" when prompted
# ✅ Done!
```

### 2️⃣ First-Time Setup
```bash
# Link to your project
npm run supabase:link
# Enter your project reference ID

# Apply all migrations
npm run migrate
# ✅ Database ready!
```

### 3️⃣ Creating a New Feature
```bash
# Create migration
npm run migrate:new add_my_feature

# Edit file: supabase/migrations/YYYYMMDD_add_my_feature.sql
# Add your SQL

# Test locally (optional)
npm run supabase:start
npm run dev

# Apply to remote
npm run migrate:apply

# Commit
git add supabase/migrations/
git commit -m "Add my feature migration"
git push
```

### 4️⃣ Local Development
```bash
# Start local Supabase (requires Docker)
npm run supabase:start

# Get credentials from output
# Create .env.local with:
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Start app
npm run dev

# Access Supabase Studio
# http://localhost:54323

# When done
npm run supabase:stop
```

---

## Troubleshooting Quick Fixes

### "Not logged in"
```bash
npx supabase login
```

### "Project not linked"
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### "Permission denied"
```bash
chmod +x scripts/*.sh
```

### "Docker not found"
Download and install Docker Desktop:
https://www.docker.com/products/docker-desktop

---

## File Locations

```
📁 Project Root
├── 📄 SUPABASE_MIGRATIONS.md       ← Complete guide
├── 📄 MIGRATION_QUICKSTART.md      ← Quick start
├── 📄 MIGRATION_CHEATSHEET.md      ← This file
├── 📁 scripts/
│   ├── 📄 README.md                ← Scripts documentation
│   ├── 🔧 apply-migrations.sh      ← Quick apply script
│   └── 🔧 migrate-supabase.sh      ← Full helper script
└── 📁 supabase/
    ├── 📄 config.toml              ← Project config
    └── 📁 migrations/              ← All migration files
        ├── 📄 20251108_*.sql
        ├── 📄 20251109_*.sql
        └── ...
```

---

## Script Options

### Helper Script Commands
```bash
bash scripts/migrate-supabase.sh [command]

Commands:
  install    - Install Supabase CLI
  status     - Check migration status
  apply      - Apply migrations to remote
  local      - Start local Supabase
  new [name] - Create new migration
  link       - Link to project
  reset      - Reset local database (⚠️ destructive)
  help       - Show help
```

---

## NPM Scripts Reference

| Task | Command | Description |
|------|---------|-------------|
| **Quick apply** | `npm run migrate` | Interactive migration apply |
| Check status | `npm run migrate:status` | See pending migrations |
| Apply now | `npm run migrate:apply` | Apply without prompts |
| New migration | `npm run migrate:new [name]` | Create migration file |
| Show help | `npm run migrate:help` | Display help |
| **Local Supabase** | | |
| Start local | `npm run supabase:start` | Start Docker instance |
| Stop local | `npm run supabase:stop` | Stop Docker instance |
| Check status | `npm run supabase:status` | See local status |
| Link project | `npm run supabase:link` | Link to remote |

---

## Common Scenarios

### ✅ Scenario: "I just pulled from GitHub"
```bash
npm run migrate
```

### ✅ Scenario: "I need to check what's new"
```bash
npm run migrate:status
```

### ✅ Scenario: "I'm adding a new table"
```bash
npm run migrate:new add_users_table
# Edit the file
npm run migrate:apply
git add . && git commit -m "Add users table" && git push
```

### ✅ Scenario: "I want to test locally first"
```bash
npm run supabase:start
npm run migrate:apply
npm run dev
# Test your changes
npm run supabase:stop
```

### ✅ Scenario: "I broke my local database"
```bash
npm run supabase:stop
npm run supabase:start
# Fresh database with all migrations applied
```

---

## Environment Files

### For Cloud Supabase
Create `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### For Local Supabase
Create `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<from-supabase-start-output>
```

---

## Getting Your Project Reference

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy **Reference ID**
5. Use it: `npx supabase link --project-ref REFERENCE_ID`

Or it's in `supabase/config.toml`:
```toml
project_id = "your-reference-id"
```

---

## Best Practices

✅ **Always**:
- Run `npm run migrate` after pulling from GitHub
- Create migrations for schema changes
- Test locally before pushing
- Commit migration files to Git

❌ **Never**:
- Edit applied migrations
- Modify database directly in Supabase Studio
- Skip migrations
- Delete migration files

---

## Documentation Links

- **Complete Guide**: [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)
- **Quick Start**: [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)
- **Scripts Help**: [scripts/README.md](./scripts/README.md)
- **Supabase Docs**: https://supabase.com/docs/guides/cli

---

## Emergency Commands

### "I need to reset everything locally"
```bash
npm run supabase:stop
rm -rf supabase/.temp
npm run supabase:start
```

### "My migrations are stuck"
```bash
# Check status
npm run migrate:status

# If needed, login again
npx supabase login

# Try linking again
npm run supabase:link

# Apply
npm run migrate:apply
```

### "I accidentally applied wrong migration"
Create a rollback migration:
```bash
npm run migrate:new rollback_previous_change
# Edit and add reverse SQL
npm run migrate:apply
```

---

## Quick Test

To verify everything works:

```bash
# 1. Check migrations exist
ls -la supabase/migrations/

# 2. Check CLI works
npx supabase --version

# 3. Check project config
cat supabase/config.toml | grep project_id

# 4. Check status
npm run migrate:status

# All good? You're ready to go! ✅
```

---

**Pro Tip**: Bookmark this file for quick reference!

**One Command to Rule Them All**: `npm run migrate` 🚀
