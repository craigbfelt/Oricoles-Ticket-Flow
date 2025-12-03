# 🚀 Vercel & Supabase Migration Guide

This guide helps you migrate the Oricol Dashboard to new, separate Vercel and Supabase accounts.

## 📋 Quick Overview

| Platform | Free Tier Limits | What You Need |
|----------|-----------------|---------------|
| **Supabase** | 500MB database, 1GB file storage, 50K monthly active users | Email + Project credentials |
| **Vercel** | 100GB bandwidth, serverless functions, automatic SSL | GitHub account connection |
| **GitHub** | Unlimited public/private repos, Actions minutes | Already connected |

## 🔑 Required API Details

Before starting, you'll need to gather:

### From Supabase (after creating project):
1. **Project URL** - `https://your-project-id.supabase.co`
2. **Anon/Public Key** - For frontend authentication
3. **Project ID** - Unique identifier (e.g., `abcdefghijklmnop`)
4. **Service Role Key** - For backend operations (keep secret!)
5. **Database Password** - Set during project creation
6. **Access Token** - For CLI and GitHub Actions

### From Vercel:
1. **Project Name** - Your custom project name
2. **Domain** - Auto-generated or custom domain

---

## 📝 Step-by-Step Migration Checklist

### ✅ Phase 1: Create New Accounts

- [ ] **1.1** Create Supabase Account
  - Go to [supabase.com](https://supabase.com)
  - Sign up with email or GitHub
  - Verify email address

- [ ] **1.2** Create New Supabase Project
  - Click "New Project"
  - Choose organization (or create one)
  - Enter project name: `oricol-dashboard`
  - Set a strong database password (SAVE THIS!)
  - Select region closest to your users
  - Click "Create new project"
  - Wait for project to be ready (~2 minutes)

- [ ] **1.3** Gather Supabase Credentials
  - Go to Project Settings → API
  - Copy and save:
    - `Project URL`
    - `anon public key`
    - `service_role key` (keep secret!)
  - Go to Project Settings → General
  - Copy the `Reference ID` (Project ID)

- [ ] **1.4** Create Supabase Access Token
  - Go to [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
  - Click "Generate new token"
  - Name: `GitHub Actions`
  - Copy and save the token (shown only once!)

### ✅ Phase 2: Set Up Database

- [ ] **2.1** Apply Database Migrations
  
  **Option A: Using Supabase SQL Editor (Recommended for free tier)**
  1. Go to your Supabase project dashboard
  2. Click "SQL Editor" in sidebar
  3. Run each migration file from `supabase/migrations/` in chronological order
  4. Start with `20251100000000_create_schema_migrations_table.sql`
  
  **Option B: Using Supabase CLI**
  ```bash
  # Install Supabase CLI
  npm install -g supabase
  
  # Login to Supabase
  supabase login
  
  # Link to your new project
  supabase link --project-ref YOUR_PROJECT_ID
  
  # Apply all migrations
  supabase db push
  ```

- [ ] **2.2** Verify Tables Created
  Run in SQL Editor:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```
  
  Expected tables:
  - `profiles`
  - `user_roles`
  - `tickets`
  - `assets`
  - `ticket_comments`
  - And many more...

- [ ] **2.3** Create Storage Buckets
  Run in SQL Editor:
  ```sql
  -- Create storage buckets
  INSERT INTO storage.buckets (id, name, public) 
  VALUES 
    ('diagrams', 'diagrams', true),
    ('documents', 'documents', true)
  ON CONFLICT (id) DO NOTHING;
  ```

- [ ] **2.4** Set Up Admin User
  After creating your first user account, you need to assign admin privileges.
  
  **Option A: Use Pre-configured Admin Emails**
  
  Sign up with one of these emails to automatically get admin access:
  - `admin@oricol.co.za`
  - `admin@zerobitone.co.za`
  - `craig@zerobitone.co.za`
  
  **Option B: Manually Assign Admin Role**
  
  If using a different email, run this SQL in the SQL Editor after signing up:
  ```sql
  -- First, find your user ID by checking the profiles table
  SELECT user_id, email FROM public.profiles;
  
  -- Then assign admin role (replace YOUR_USER_ID with actual UUID)
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('YOUR_USER_ID', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Or use this to make ALL existing users admins (useful for initial setup)
  INSERT INTO public.user_roles (user_id, role)
  SELECT user_id, 'admin'::app_role FROM public.profiles
  ON CONFLICT (user_id, role) DO NOTHING;
  ```
  
  **⚠️ Important:** Without admin role, you will only see Dashboard, Remote Support, and Settings pages!

### ✅ Phase 3: Connect Vercel

- [ ] **3.1** Create Vercel Account
  - Go to [vercel.com](https://vercel.com)
  - Sign up with GitHub (recommended)

- [ ] **3.2** Import GitHub Repository
  - Click "Add New" → "Project"
  - Select this repository: `oricol-ticket-flow`
  - Click "Import"

- [ ] **3.3** Configure Environment Variables
  In Vercel project settings → Environment Variables, add:
  
  | Variable | Value |
  |----------|-------|
  | `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
  | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key |
  | `VITE_SUPABASE_PROJECT_ID` | Your project ID |

- [ ] **3.4** Deploy
  - Click "Deploy"
  - Wait for build to complete
  - Note your deployment URL

### ✅ Phase 4: Configure GitHub Actions

- [ ] **4.1** Add GitHub Secrets
  Go to your GitHub repository → Settings → Secrets and variables → Actions
  
  Add these secrets:
  
  | Secret Name | Value |
  |-------------|-------|
  | `SUPABASE_ACCESS_TOKEN` | Your access token from Phase 1.4 |
  | `SUPABASE_DB_PASSWORD` | Your database password |

- [ ] **4.2** Update Config File
  Edit `supabase/config.toml`:
  ```toml
  project_id = "your-new-project-id"
  ```

- [ ] **4.3** Push Changes
  ```bash
  git add .
  git commit -m "Update Supabase project configuration for new account"
  git push
  ```

### ✅ Phase 5: Verify Deployment

- [ ] **5.1** Test Frontend
  - Open your Vercel deployment URL
  - Verify the app loads correctly
  - Check browser console for errors

- [ ] **5.2** Test Authentication
  - Try to sign up with a new account
  - Verify email confirmation works
  - Log in and check session persistence

- [ ] **5.3** Test Database Connection
  - Create a test ticket
  - Verify it appears in the list
  - Check data persists after refresh

- [ ] **5.4** Verify Admin Access
  - After logging in, you should see ALL navigation items in the sidebar
  - If you only see Dashboard, Remote Support, and Settings, run the admin SQL from step 2.4
  - Log out and log back in after assigning admin role

- [ ] **5.5** Test GitHub Actions
  - Make a small change to a migration file
  - Create a PR and merge to main
  - Check Actions tab for successful deployment

---

## 🚨 Troubleshooting

### Common Issues

#### Only seeing Dashboard, Remote Support & Settings (Blank/Limited Access)
**Problem:** After logging in, you can only access 3 pages and other pages appear blank or inaccessible.

**Cause:** Your user account doesn't have an admin role assigned.

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query to find your user ID:
   ```sql
   SELECT user_id, email FROM public.profiles;
   ```
3. Assign admin role:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR_USER_ID_HERE', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```
4. Log out of the app and log back in
5. You should now see all navigation items

#### Pages Show "Configuration Required" Error
**Problem:** All pages show a configuration error message.

**Cause:** Supabase environment variables are not set in Vercel.

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
   - `VITE_SUPABASE_PROJECT_ID` - Your project ID
3. Redeploy the application

#### "Invalid API key"
- Double-check you're using the `anon` key, not `service_role`
- Verify the key matches your project
- Check for extra spaces in environment variables

#### "relation does not exist"
- Migrations haven't been applied
- Run all migration files in chronological order
- Check SQL Editor for errors

#### "RLS policy violation"
- Row Level Security is blocking access
- Verify user is authenticated
- Check RLS policies are correctly set up

#### GitHub Actions failing
- Verify `SUPABASE_ACCESS_TOKEN` is correct
- Check `SUPABASE_DB_PASSWORD` matches
- Ensure project ID in config.toml is correct

### Manual Migration Commands

If automated migrations fail, run manually in SQL Editor:

```sql
-- List all migration files needed
SELECT * FROM pg_catalog.pg_tables 
WHERE schemaname = 'public';

-- Check current migration status
SELECT * FROM schema_migrations ORDER BY version;
```

---

## 🔄 Automated Deployment Flow

Once configured, the system works automatically:

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │
│    Trigger      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌─────────┐
│Vercel │ │Supabase │
│Deploy │ │Migrate  │
└───────┘ └─────────┘
```

---

## 📊 Migration Tracker GUI

Access the visual migration tracker at:
```
/migration-tracker
```

This provides:
- ✅ Visual step-by-step progress
- 📝 Input fields for API credentials
- 🔍 Connection validation
- 📜 Real-time logs
- 💾 Progress saving (localStorage)

---

## 🆓 Free Tier Considerations

### Supabase Free Tier Limits
- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 2 GB
- **Auth**: 50,000 Monthly Active Users
- **Edge Functions**: 500K invocations/month

### Vercel Free Tier Limits
- **Bandwidth**: 100 GB
- **Serverless Functions**: 100 GB-hours
- **Build Time**: 6,000 minutes/month
- **Deployments**: Unlimited

### Best Practices for Free Tier
1. Optimize images before upload
2. Use database indexes appropriately
3. Clean up unused storage files
4. Monitor usage in dashboards

---

## 📞 Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review Supabase logs: Project → Logs
3. Check Vercel logs: Project → Deployments → Logs
4. Review GitHub Actions: Repository → Actions

---

## 🎯 Quick Reference

```bash
# Install dependencies
npm install

# Run locally with new credentials
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
export VITE_SUPABASE_PROJECT_ID="your-project-id"
npm run dev

# Build for production
npm run build

# Apply migrations (CLI)
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase db push
```

---

Last updated: 2024
