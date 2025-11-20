# Quick Reference: Automated Migrations

## ⚡ Quick Start

### First Time Setup (5 minutes)

1. **Add GitHub Secrets**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add `SUPABASE_ACCESS_TOKEN` (from [Supabase Account](https://supabase.com/dashboard/account/tokens))
   - Add `SUPABASE_DB_PASSWORD` (from [Supabase Project Settings](https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/settings/database))

2. **Done!** Migrations will auto-deploy on PR merge

### Creating Migrations

```bash
# Create new migration
npm run migrate:new my_feature_name

# Edit the file in supabase/migrations/

# Test locally (optional)
npm run migrate:apply

# Commit and push
git add .
git commit -m "Add migration for my feature"
git push
```

### Deploying Migrations

1. **Create PR** with your migration
2. **Squash and merge** to main
3. **Done!** GitHub Actions automatically:
   - Detects migration changes
   - Applies migrations to database
   - Posts commit comment with status

## 📊 Workflow Status

Check deployment status:
- Go to: Repository → Actions → "Deploy Database Migrations"
- View logs to see which migrations were applied
- Check commit comments for quick status

## 🔗 Quick Links

### Documentation
- **[AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md)** - Full setup guide
- **[AUTOMATED_MIGRATION_GUIDE.md](./AUTOMATED_MIGRATION_GUIDE.md)** - Complete documentation
- **[MIGRATION_AUTOMATION_SUMMARY.md](./MIGRATION_AUTOMATION_SUMMARY.md)** - Implementation summary

### External Links
- **[Supabase Dashboard](https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp)** - Your database
- **[Supabase SQL Editor](https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/sql)** - Run SQL manually
- **[GitHub Actions](../../actions)** - View workflow runs

## 🛠️ Common Commands

```bash
# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:new description

# Apply migrations locally
npm run migrate:apply

# Build the app
npm run build

# Run linter
npm run lint
```

## 🔍 Troubleshooting

### Migration deployment failed
1. Check GitHub Actions logs
2. Review error message
3. Fix SQL in migration file
4. Push fix and merge again

### Need to apply manually
```bash
npx supabase link --project-ref kwmeqvrmtivmljujwocp
npx supabase db push
```

### Check which migrations are applied
```sql
SELECT * FROM schema_migrations ORDER BY version;
```

## 📋 Best Practices

✅ **DO**:
- Test migrations locally first
- Use `IF NOT EXISTS` in CREATE statements
- Use `IF EXISTS` in DROP statements
- Keep migrations small and focused
- Squash and merge PRs

❌ **DON'T**:
- Modify old migration files
- Delete migration files
- Skip testing migrations
- Use `force push` on main branch

## 🎯 Migration File Naming

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20251120120000_add_user_table.sql`

Always use CLI to create: `npm run migrate:new description`

## 🚨 Emergency Procedures

### Rollback a migration
Migrations don't auto-rollback. To revert:
1. Create new migration that reverses changes
2. Deploy as normal

### Skip a problematic migration
Not recommended! But if needed:
1. Apply all migrations manually except the problematic one
2. Mark problematic migration as applied in `schema_migrations`
3. Fix the issue in a new migration

## 📞 Get Help

- **Setup Issues**: See [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md)
- **Deployment Issues**: See [AUTOMATED_MIGRATION_GUIDE.md](./AUTOMATED_MIGRATION_GUIDE.md)
- **SQL Issues**: Check Supabase Dashboard logs
- **GitHub Actions Issues**: Check workflow logs

---

**Quick Tip**: Bookmark this page for easy reference!

**Last Updated**: November 20, 2025
