# Verification Guide - Schema Cache Fix

This guide helps you verify that the schema cache error fix has been successfully applied.

## Quick Verification

After running `LOVABLE_FIX_ALL_TABLES.sql`, perform these checks:

### 1. Verify Tables Exist

Run this query in Supabase SQL Editor:

```sql
SELECT 
  table_name,
  '✅ Exists' as status
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

**Expected Result:** You should see 8 rows, one for each table, all with ✅ Exists status.

### 2. Test Application Access

1. **Refresh the application** in your browser (Ctrl+F5 / Cmd+Shift+R)
2. **Navigate to Shared Files** page
3. **Verify:**
   - No error messages appear
   - Page loads successfully
   - You can view the interface (even if empty)

### 3. Test Admin Functionality (If you're an admin)

Try creating a test folder:
1. Click **"Create Folder"** button
2. Enter:
   - Name: `Test Folder`
   - Description: `Testing schema fix`
3. Click **"Create"**

**Expected Result:** Folder should be created successfully without errors.

### 4. Check Browser Console

1. Open browser developer tools (F12)
2. Go to **Console** tab
3. Refresh the page
4. **Look for errors:**
   - ❌ If you see "PGRST205" or "table not found" → Migration not applied yet
   - ✅ If you see no table-related errors → Fix is working!

## Detailed Verification

### Verify Table Structure

Check that tables have the correct columns:

```sql
-- Check shared_folders structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'shared_folders'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- name (text)
- description (text)
- parent_folder_id (uuid)
- created_by (uuid)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Verify RLS Policies

Check Row Level Security policies are in place:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN (
  'shared_folders',
  'shared_folder_files',
  'shared_folder_permissions',
  'user_groups',
  'user_group_members'
)
ORDER BY tablename, policyname;
```

**Expected:** You should see multiple policies for each table, including:
- "Users can view..." policies
- "Admins can manage..." policies

### Verify Indexes

Check that performance indexes exist:

```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'shared_folders',
  'shared_folder_files',
  'shared_folder_permissions',
  'user_groups',
  'user_group_members'
)
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes per table for foreign keys and common queries.

## Common Issues After Fix

### Issue: "Still getting PGRST205 error"

**Solutions:**
1. **Clear browser cache:** Ctrl+Shift+Delete (Chrome/Edge) or Cmd+Shift+Delete (Safari)
2. **Hard refresh:** Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
3. **Check Supabase schema cache:** 
   - In Supabase dashboard, go to Database → Schema
   - Click "Reload Schema Cache"
4. **Verify SQL ran successfully:** Check for error messages in SQL Editor output

### Issue: "Permission denied when creating folders"

**Solutions:**
1. **Verify you're logged in as admin:**
   ```sql
   SELECT * FROM user_roles 
   WHERE user_id = auth.uid() 
   AND role = 'admin';
   ```
   Should return at least one row.

2. **Check RLS policies exist:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'shared_folders';
   ```
   Should return policies for admins.

### Issue: "Tables exist but app still errors"

**Solutions:**
1. **Check TypeScript types match:** This PR updated the types, so make sure you've pulled the latest code
2. **Restart Lovable dev server:** If using Lovable, try stopping and starting the preview
3. **Check Supabase connection:** Verify `.env` has correct Supabase URL and keys

## Success Indicators

✅ **Fix is successful when:**
- All 8 tables appear in database
- No PGRST205 errors in browser console
- Shared Files page loads without errors
- Admin users can create folders
- TypeScript autocomplete works for new tables

## Need Help?

If verification fails:
1. Review [DEPLOYMENT_FIX_SCHEMA_CACHE.md](./DEPLOYMENT_FIX_SCHEMA_CACHE.md)
2. Check [QUICK_FIX_SHARED_FOLDERS.md](./QUICK_FIX_SHARED_FOLDERS.md)
3. Review Supabase logs for detailed error messages
4. Ensure you ran the complete `LOVABLE_FIX_ALL_TABLES.sql` script

---

**Last Updated:** 2025-11-17  
**Related To:** PGRST205 error fix, schema cache issues
