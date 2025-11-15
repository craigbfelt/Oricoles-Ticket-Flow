-- Verify and Fix RLS Policies for Lovable Deployment
-- This migration ensures all RLS policies are correctly configured for production use
-- Date: 2025-11-15
-- Purpose: Comprehensive verification and fixing of RLS policies for Lovable environment

-- ============================================================================
-- PART 1: Verify and Create Storage Buckets
-- ============================================================================

-- Ensure documents bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Public for easy viewing
  104857600,  -- 100MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure diagrams bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,  -- Public for easy viewing
  52428800,  -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: Enable RLS on Storage Objects
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Clean Up All Existing Storage Policies (Complete Reset)
-- ============================================================================

-- Drop all possible policy variations to ensure clean state
DO $$
DECLARE
  pol record;
BEGIN
  -- Drop all policies on storage.objects that relate to our buckets
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (
      policyname LIKE '%document%' OR
      policyname LIKE '%diagram%' OR
      policyname LIKE '%storage%'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- PART 4: Create Clean, Consistent Storage Policies for DOCUMENTS Bucket
-- ============================================================================

-- Allow authenticated users to INSERT (upload) files
CREATE POLICY "documents_storage_insert_policy"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Allow public users to SELECT (view/download) files
CREATE POLICY "documents_storage_select_policy"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');

-- Allow authenticated users to UPDATE files
CREATE POLICY "documents_storage_update_policy"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to DELETE files
CREATE POLICY "documents_storage_delete_policy"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');

-- ============================================================================
-- PART 5: Create Clean, Consistent Storage Policies for DIAGRAMS Bucket
-- ============================================================================

-- Allow authenticated users to INSERT (upload) files
CREATE POLICY "diagrams_storage_insert_policy"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'diagrams');

-- Allow public users to SELECT (view/download) files
CREATE POLICY "diagrams_storage_select_policy"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'diagrams');

-- Allow authenticated users to UPDATE files
CREATE POLICY "diagrams_storage_update_policy"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'diagrams')
  WITH CHECK (bucket_id = 'diagrams');

-- Allow authenticated users to DELETE files
CREATE POLICY "diagrams_storage_delete_policy"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'diagrams');

-- ============================================================================
-- PART 6: Verify and Fix Table RLS Policies
-- ============================================================================

-- Enable RLS on documents table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'documents'
  ) THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "documents_table_select" ON public.documents;
    DROP POLICY IF EXISTS "documents_table_insert" ON public.documents;
    DROP POLICY IF EXISTS "documents_table_update" ON public.documents;
    DROP POLICY IF EXISTS "documents_table_delete" ON public.documents;
    
    -- Create clean policies
    CREATE POLICY "documents_table_select"
      ON public.documents FOR SELECT
      TO authenticated
      USING (true);
    
    CREATE POLICY "documents_table_insert"
      ON public.documents FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    CREATE POLICY "documents_table_update"
      ON public.documents FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    
    CREATE POLICY "documents_table_delete"
      ON public.documents FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Enable RLS on import_jobs table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'import_jobs'
  ) THEN
    ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "import_jobs_table_select" ON public.import_jobs;
    DROP POLICY IF EXISTS "import_jobs_table_insert" ON public.import_jobs;
    DROP POLICY IF EXISTS "import_jobs_table_update" ON public.import_jobs;
    DROP POLICY IF EXISTS "import_jobs_table_delete" ON public.import_jobs;
    
    -- Create clean policies
    CREATE POLICY "import_jobs_table_select"
      ON public.import_jobs FOR SELECT
      TO authenticated
      USING (true);
    
    CREATE POLICY "import_jobs_table_insert"
      ON public.import_jobs FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    CREATE POLICY "import_jobs_table_update"
      ON public.import_jobs FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    
    CREATE POLICY "import_jobs_table_delete"
      ON public.import_jobs FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- PART 7: Verification Query (For Manual Testing)
-- ============================================================================

-- You can run this query to verify the policies are correctly set up:
/*
-- Check storage buckets
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id IN ('documents', 'diagrams');

-- Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%document%' OR policyname LIKE '%diagram%'
ORDER BY policyname;

-- Check table policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'import_jobs')
ORDER BY tablename, policyname;
*/

-- ============================================================================
-- PART 8: Grant Necessary Permissions
-- ============================================================================

-- Ensure authenticated role has necessary permissions on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads - verified 2025-11-15';

-- This migration provides:
-- 1. Complete cleanup of all existing policies to prevent conflicts
-- 2. Consistent naming convention for all new policies
-- 3. Proper bucket configuration with file type restrictions
-- 4. Comprehensive RLS policies for both storage and tables
-- 5. Verification queries for manual testing
-- 6. Proper permissions for authenticated users
