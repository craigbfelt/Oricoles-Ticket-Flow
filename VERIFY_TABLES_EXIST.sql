-- ============================================================================
-- VERIFY TABLES EXIST - Run this after LOVABLE_FIX_ALL_TABLES.sql
-- ============================================================================
-- This script checks if all required tables were created successfully
-- 
-- HOW TO RUN THIS ON LOVABLE:
-- 1. Go to Lovable → Database → SQL Editor
-- 2. Copy and paste this file
-- 3. Click Run/Execute
-- 4. Check the results to see which tables exist
-- ============================================================================

-- Check if all required tables exist
DO $$
DECLARE
  table_count INTEGER;
  missing_tables TEXT[];
  required_tables TEXT[] := ARRAY[
    'user_groups',
    'user_group_members', 
    'group_permissions',
    'user_permissions',
    'shared_files',
    'shared_folders',
    'shared_folder_files',
    'shared_folder_permissions'
  ];
  table_name TEXT;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Verifying Required Tables...';
  RAISE NOTICE '============================================================';
  
  -- Check each required table
  FOREACH table_name IN ARRAY required_tables
  LOOP
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name;
    
    IF table_count > 0 THEN
      RAISE NOTICE '✅ Table exists: public.%', table_name;
    ELSE
      RAISE NOTICE '❌ Table missing: public.%', table_name;
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  RAISE NOTICE '============================================================';
  
  IF array_length(missing_tables, 1) IS NULL THEN
    RAISE NOTICE '🎉 SUCCESS! All required tables exist!';
    RAISE NOTICE 'You can now use the Shared Files feature.';
  ELSE
    RAISE WARNING '⚠️  Missing tables detected!';
    RAISE WARNING 'Missing: %', array_to_string(missing_tables, ', ');
    RAISE WARNING 'Please run LOVABLE_FIX_ALL_TABLES.sql first.';
  END IF;
  
  RAISE NOTICE '============================================================';
END $$;

-- Show table row counts
SELECT 
  schemaname,
  tablename,
  COALESCE(n_live_tup, 0) as estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_groups',
    'user_group_members',
    'group_permissions', 
    'user_permissions',
    'shared_files',
    'shared_folders',
    'shared_folder_files',
    'shared_folder_permissions'
  )
ORDER BY tablename;

-- Check RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND tablename IN (
    'user_groups',
    'user_group_members',
    'group_permissions',
    'user_permissions',
    'shared_files', 
    'shared_folders',
    'shared_folder_files',
    'shared_folder_permissions'
  )
ORDER BY tablename;

-- Check policies exist
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN cmd = '*' THEN 'ALL'
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'w' THEN 'INSERT'
    WHEN cmd = 'a' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
  END as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_groups',
    'user_group_members',
    'group_permissions',
    'user_permissions',
    'shared_files',
    'shared_folders', 
    'shared_folder_files',
    'shared_folder_permissions'
  )
ORDER BY tablename, policyname;
