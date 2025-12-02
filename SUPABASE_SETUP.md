# Supabase Database Setup Guide

This guide helps you set up the Supabase database for the Oricol Helpdesk application now that it has been moved away from Lovable.

## 📋 Current Project Details

| Setting | Value |
|---------|-------|
| **Project Name** | oricoles's Project |
| **Project ID** | `blhidceerkrumgxjhidq` |
| **Project URL** | `https://blhidceerkrumgxjhidq.supabase.co` |
| **Region** | Check Supabase Dashboard |

## 🚀 Quick Start

### Option 1: Using Supabase CLI (Recommended)

This is the fastest and most reliable method.

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref blhidceerkrumgxjhidq

# 4. Apply all migrations
supabase db push

# 5. Done! Your database is ready.
```

### Option 2: Manual Setup via SQL Editor (Recommended if CLI doesn't work)

If you can't use the CLI, apply the database schema manually:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq)
2. Click **SQL Editor** in the sidebar
3. Copy the contents of `COMPLETE_DATABASE_SETUP.sql` from this repository
4. Paste and click **Run**
5. Done!

---

## 🔧 Step-by-Step Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Enter project details:
   - **Name**: `oricol-helpdesk` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click **Create new project** and wait 2-3 minutes

### Step 2: Get Your Credentials

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Your public API key
   - **Project ID**: Found in Project Settings → General → Reference ID

### Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id-here
```

### Step 4: Apply Database Migrations

#### Using Supabase CLI (Recommended)

```bash
# Install dependencies
npm install

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_ID

# Apply all migrations
npx supabase db push
```

#### Using SQL Editor

If the CLI doesn't work, run migrations manually in the SQL Editor. See the [Running Migrations Manually](#running-migrations-manually) section below.

### Step 5: Create Storage Buckets

In Supabase Dashboard → Storage:

1. Click **New bucket**
2. Create these buckets:
   - `diagrams` - Public bucket for network diagrams
   - `documents` - Public bucket for document uploads

Or run this SQL in the SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('diagrams', 'diagrams', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
```

### Step 6: Verify Setup

Run this SQL to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables include:
- `profiles`, `user_roles`, `tickets`, `assets`, `branches`
- `crm_companies`, `crm_contacts`, `crm_deals`, `crm_activities`
- `documents`, `shared_files`, `shared_folders`
- And many more...

---

## 📝 Running Migrations Manually

If you need to run migrations manually, go to the `supabase/migrations/` folder and run each SQL file in chronological order (by filename) in the Supabase SQL Editor.

The key migrations are:

1. **`20251100000000_create_schema_migrations_table.sql`** - Migration tracking table
2. **`20251108052000_*.sql`** - Core tables (profiles, tickets, assets)
3. **`20251109045855_*.sql`** - User roles and permissions
4. **`20251119080900_create_crm_system.sql`** - CRM tables
5. **Later migrations** - Additional features and fixes

### Quick Setup SQL

For a quick setup, you can also use the consolidated scripts:

1. **`LOVABLE_FIX_ALL_TABLES.sql`** - Creates shared files and user groups
2. **`APPLY_THIS_SQL_NOW.sql`** - Creates CRM tables
3. **`SETUP_STORAGE_POLICIES.sql`** - Sets up storage bucket policies

---

## 🔐 GitHub Actions Setup (Automated Deployments)

To enable automatic migration deployment when you merge PRs:

### Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions, and add:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_ACCESS_TOKEN` | Get from [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Your database password from project creation |

### Update Project ID

Edit `supabase/config.toml` and update the project ID:

```toml
project_id = "your-project-id"
```

Now when you merge a PR with migration changes, GitHub Actions will automatically apply them!

---

## 🔄 Migrating from Lovable

If you previously used Lovable and want to migrate to your own Supabase:

### Option A: Fresh Start (Recommended)

1. Create a new Supabase project
2. Apply all migrations using `supabase db push`
3. Update environment variables in your deployment platform
4. Deploy the app

### Option B: Keep Existing Supabase

If Lovable created a Supabase project you want to keep:

1. Find your Supabase project ID (check Lovable settings or environment)
2. Link to it: `supabase link --project-ref YOUR_PROJECT_ID`
3. Check migration status: `supabase migration list`
4. Apply any pending migrations: `supabase db push`

---

## 🆘 Troubleshooting

### "relation does not exist" Error

Migrations haven't been applied. Run:
```bash
npx supabase db push
```

Or apply migrations manually via SQL Editor.

### "Invalid API key" Error

Check that:
1. You're using the `anon` key, not `service_role`
2. The key matches your project
3. No extra spaces in environment variables

### "RLS policy violation" Error

Row Level Security is blocking access. Ensure:
1. User is authenticated
2. Migrations were applied correctly
3. Check the specific table's RLS policies

### GitHub Actions Failing

1. Verify `SUPABASE_ACCESS_TOKEN` secret is set correctly
2. Check `SUPABASE_DB_PASSWORD` matches your database password
3. Ensure `project_id` in `supabase/config.toml` is correct

---

## 📚 Additional Resources

- [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md) - GitHub Actions automation
- [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md) - Full migration guide
- [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) - Complete migration reference
- [Supabase Documentation](https://supabase.com/docs)

---

## ✅ Checklist

- [ ] Created Supabase project
- [ ] Copied Project URL and anon key
- [ ] Updated `.env` file with credentials
- [ ] Applied database migrations
- [ ] Created storage buckets (diagrams, documents)
- [ ] (Optional) Added GitHub secrets for automation
- [ ] Tested the app loads without errors

---

Last Updated: December 2024
