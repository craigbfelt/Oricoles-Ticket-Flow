# Quick Start: Fix PGRST205 Schema Cache Error

## 🚨 Problem
Getting error: **"Could not find the table 'public_shared_folders' in the schema cache"** (PGRST205)?

## ⚡ Quick Fix (2 Minutes)

### Step 1: Open SQL Editor
1. Go to your Lovable/Supabase project
2. Click **Database** → **SQL Editor**

### Step 2: Run the Fix
1. Open [`LOVABLE_FIX_ALL_TABLES.sql`](./LOVABLE_FIX_ALL_TABLES.sql)
2. Copy the **entire file**
3. Paste into SQL Editor
4. Click **"Run"**

### Step 3: Refresh Your App
1. Go back to your application
2. Press **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac)
3. Navigate to **Shared Files**
4. ✅ Error should be gone!

## 📖 Need More Help?

- **Detailed Instructions:** [DEPLOYMENT_FIX_SCHEMA_CACHE.md](./DEPLOYMENT_FIX_SCHEMA_CACHE.md)
- **Verify It Worked:** [VERIFICATION_SCHEMA_FIX.md](./VERIFICATION_SCHEMA_FIX.md)
- **Complete Summary:** [FIX_SUMMARY_SCHEMA_CACHE.md](./FIX_SUMMARY_SCHEMA_CACHE.md)

## 🎯 What This Fixes

✅ Creates 8 missing database tables
✅ Sets up permissions and security
✅ Enables Shared Files functionality
✅ Resolves PGRST205 error permanently

## ⏱️ Time Required
**Total: 2-5 minutes**

---

**Still Having Issues?** See [DEPLOYMENT_FIX_SCHEMA_CACHE.md](./DEPLOYMENT_FIX_SCHEMA_CACHE.md) for troubleshooting.
