# Fix: Schema Cache Error (PGRST205) - "public_shared_folders" Table Not Found

## Problem Statement
The application is showing the following error:
```
Could not find the table "public_shared_folders" in the schema cache
Error code: PGRST205
```

## Root Cause
This error occurs because:
1. The migration files exist in the codebase but **have not been applied** to the Supabase database
2. PostgREST (Supabase's API layer) cannot find the tables in its schema cache
3. The database needs to have the tables created before the application can query them

## Solution: Apply Database Migrations

You have **TWO options** to fix this issue:

---

### Option 1: Run SQL Script Directly in Supabase/Lovable (RECOMMENDED - 2 minutes)

This is the **fastest and easiest** method.

#### Steps:

1. **Open SQL Editor**
   - Go to your Lovable/Supabase project dashboard
   - Navigate to **Database** → **SQL Editor** in the sidebar
   
2. **Run the Fix Script**
   - Open the file [`LOVABLE_FIX_ALL_TABLES.sql`](./LOVABLE_FIX_ALL_TABLES.sql) from this repository
   - **Copy the ENTIRE contents** of that file
   - **Paste** it into the SQL Editor
   - Click **"Run"** or **"Execute"**
   - Wait 5-10 seconds for completion

3. **Verify Success**
   You should see messages like:
   ```
   ✅ Tables created successfully
   ✅ Indexes created
   ✅ RLS policies applied
   ```

4. **Test the Application**
   - Refresh your browser
   - Navigate to the **Shared Files** page
   - The error should be gone! ✅
   - See [VERIFICATION_SCHEMA_FIX.md](./VERIFICATION_SCHEMA_FIX.md) for detailed verification steps

**Optional Verification:** Run [`VERIFY_TABLES_EXIST.sql`](./VERIFY_TABLES_EXIST.sql) to confirm all tables were created.

---

### Option 2: Use Supabase CLI (For developers with local setup)

If you have Supabase CLI installed and configured:

```bash
# Navigate to project directory
cd /path/to/oricol-ticket-flow-34e64301

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref <your-project-ref>

# Apply all pending migrations
npx supabase db push

# Verify migrations were applied
npx supabase migration list
```

---

## What Gets Fixed

This deployment creates the following tables:

### User Groups System
- ✅ `user_groups` - Organize users into groups
- ✅ `user_group_members` - Group membership
- ✅ `group_permissions` - Group-level permissions
- ✅ `user_permissions` - Individual user permissions

### Shared Files System
- ✅ `shared_folders` - Folder structure for organizing files
- ✅ `shared_folder_files` - Files within folders
- ✅ `shared_folder_permissions` - Folder access control
- ✅ `shared_files` - File sharing between users

### Additional Updates
- ✅ Creates all necessary indexes for performance
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Fixes admin permissions to allow folder creation
- ✅ Updates TypeScript type definitions (already included in this PR)

---

## Troubleshooting

### Error: "relation already exists"
**This is normal and safe to ignore.** The script uses `CREATE TABLE IF NOT EXISTS` so it won't break existing tables.

### Error: "permission denied"
Make sure you're logged into Lovable/Supabase with an account that has database admin access.

### Still Getting "Table Not Found"?
1. Verify the script ran without errors in the SQL Editor
2. Check the Supabase logs for any error messages
3. Try refreshing the browser page (Ctrl+F5 / Cmd+Shift+R)
4. Verify you're using an admin account (craig@zerobitone.co.za or admin@oricol.co.za)
5. Check that the Supabase project is correctly configured in your `.env` file

### How to verify tables exist?
Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_groups',
    'user_group_members', 
    'group_permissions',
    'user_permissions',
    'shared_folders',
    'shared_folder_files',
    'shared_folder_permissions',
    'shared_files'
  )
ORDER BY table_name;
```

You should see all 8 tables listed.

---

## Technical Details

### Why did this happen?
This is a common issue when:
- Code is deployed before database migrations are applied
- Migration files exist in the repository but haven't been run against the database
- The database schema is out of sync with the application code

### What is PGRST205?
`PGRST205` is a PostgREST error code meaning "relation (table) does not exist in the schema cache." PostgREST is the API layer that Supabase uses to expose your database via REST API.

### Why update TypeScript types?
The TypeScript type definitions in `src/integrations/supabase/types.ts` provide type safety and autocomplete in your IDE. This PR has already updated those types to include the new tables, so once the migrations are applied, everything will work seamlessly.

---

## Related Documentation

- [VERIFICATION_SCHEMA_FIX.md](./VERIFICATION_SCHEMA_FIX.md) - **Detailed verification and testing guide**
- [QUICK_FIX_SHARED_FOLDERS.md](./QUICK_FIX_SHARED_FOLDERS.md) - Quick reference guide
- [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md) - Comprehensive SQL guide
- [LOVABLE_SQL_CHEATSHEET.md](./LOVABLE_SQL_CHEATSHEET.md) - Quick SQL reference
- [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) - Migration management guide

---

## Summary

**The fix is simple:**
1. Open SQL Editor in Lovable/Supabase
2. Run `LOVABLE_FIX_ALL_TABLES.sql`
3. Refresh your application
4. ✅ Error resolved!

**Estimated Time:** 2-5 minutes

**Last Updated:** 2025-11-17  
**Applies To:** Schema cache errors, table not found errors, PGRST205 errors
