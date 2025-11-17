# 🚀 Quick Migration Guide for Lovable

## After Pulling from GitHub

If you pulled code changes from GitHub that include database migrations, run:

```bash
npm run migrate
```

**That's it!** This single command will:
- ✅ Check for Supabase CLI
- ✅ Link to your Supabase project
- ✅ Apply all pending migrations
- ✅ Update your database schema

---

## What are Migrations?

Migrations are SQL files that update your database schema. They're located in:
```
supabase/migrations/
```

When code is synced from GitHub, new migration files may be included. You need to apply these to your Supabase database.

---

## Quick Commands

### Apply Migrations
```bash
npm run migrate              # Interactive apply (recommended)
npm run migrate:apply        # Direct apply
```

### Check Status
```bash
npm run migrate:status       # See what needs to be applied
```

### Create New Migration
```bash
npm run migrate:new my_feature_name
```

---

## First-Time Setup

If you've never run migrations before:

1. **Link to your Supabase project**:
   ```bash
   npm run supabase:link
   ```
   
   You'll need your project reference ID from:
   - Supabase Dashboard → Settings → General → Reference ID

2. **Apply all migrations**:
   ```bash
   npm run migrate
   ```

3. **Done!** Your database is now set up.

---

## Using Supabase CLI

The Supabase CLI is already available via `npx` (no installation needed).

### Common Commands

| Task | Command |
|------|---------|
| Apply migrations | `npm run migrate` |
| Check status | `npm run migrate:status` |
| Create migration | `npm run migrate:new [name]` |
| Link to project | `npm run supabase:link` |
| Start local Supabase | `npm run supabase:start` |

---

## Helper Scripts

We provide two helper scripts in the `scripts/` directory:

### 1. Quick Apply (Recommended)
```bash
bash scripts/apply-migrations.sh
```
or
```bash
npm run migrate
```

**Perfect for**: Lovable users who just pulled from GitHub

### 2. Full Helper
```bash
bash scripts/migrate-supabase.sh help
```

**Perfect for**: Developers who need more control

---

## Troubleshooting

### "Not logged in" error
```bash
npx supabase login
```

### "Project not linked" error
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### "Permission denied" error
```bash
chmod +x scripts/*.sh
```

---

## Complete Documentation

For more details, see:
- **[SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)** - Complete migration guide
- **[scripts/README.md](./scripts/README.md)** - Helper scripts documentation
- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Local development guide

---

## Workflow Example

**Scenario**: You pulled code from GitHub and there are new migrations

```bash
# 1. Check what migrations need to be applied
npm run migrate:status

# 2. Apply them
npm run migrate

# 3. Confirm when prompted

# Done! Your database is updated.
```

---

## Best Practices

✅ **DO**:
- Always run `npm run migrate` after pulling from GitHub
- Check migration status with `npm run migrate:status`
- Create migrations for all schema changes

❌ **DON'T**:
- Don't edit the database directly in Supabase Studio
- Don't modify existing migration files
- Don't skip migrations

---

## Need Help?

1. Read **[SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)** for detailed help
2. Run `bash scripts/migrate-supabase.sh help`
3. Check [Supabase CLI docs](https://supabase.com/docs/guides/cli)

---

**Remember**: The easiest way to apply migrations is:
```bash
npm run migrate
```

It handles everything automatically! 🎉
