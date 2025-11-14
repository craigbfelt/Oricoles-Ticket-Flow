-- =============================================================================
-- STORAGE BUCKETS AND POLICIES SETUP
-- =============================================================================
-- This script creates storage buckets and RLS policies for the Oricol app
-- Run this in Supabase SQL Editor if migrations haven't been applied
--
-- Project ID: kwmeqvrmtivmljujwocp (verify this matches your project)
-- =============================================================================

-- First, verify we're in the right database
DO $$ 
BEGIN
    RAISE NOTICE 'Setting up storage buckets and policies...';
END $$;

-- =============================================================================
-- STEP 1: Create Storage Buckets
-- =============================================================================

-- Create 'documents' bucket for general document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Public bucket for easy access
  104857600, -- 100MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'application/msword', -- .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
    'application/vnd.ms-excel', -- .xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
    'application/vnd.ms-powerpoint', -- .ppt
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create 'diagrams' bucket for network diagrams and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STEP 2: Enable RLS on storage.objects
-- =============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: Create RLS Policies for 'documents' bucket
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload documents to storage" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents from storage" ON storage.objects;

-- Create policies for documents bucket
CREATE POLICY "Authenticated users can upload documents to storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public users can view documents in storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents in storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents from storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- =============================================================================
-- STEP 4: Create RLS Policies for 'diagrams' bucket
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diagrams" ON storage.objects;

-- Create policies for diagrams bucket
CREATE POLICY "Authenticated users can upload diagrams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "Public users can view diagrams"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagrams');

CREATE POLICY "Authenticated users can update diagrams"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'diagrams')
WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "Authenticated users can delete diagrams"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diagrams');

-- =============================================================================
-- STEP 5: Verify Setup
-- =============================================================================

-- Check buckets
DO $$ 
DECLARE
    bucket_count int;
BEGIN
    SELECT COUNT(*) INTO bucket_count 
    FROM storage.buckets 
    WHERE id IN ('documents', 'diagrams');
    
    RAISE NOTICE 'Created/Updated % storage buckets', bucket_count;
END $$;

-- Check policies
DO $$ 
DECLARE
    policy_count int;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname IN (
        'Authenticated users can upload documents to storage',
        'Public users can view documents in storage',
        'Authenticated users can update documents in storage',
        'Authenticated users can delete documents from storage',
        'Authenticated users can upload diagrams',
        'Public users can view diagrams',
        'Authenticated users can update diagrams',
        'Authenticated users can delete diagrams'
    );
    
    RAISE NOTICE 'Created % storage policies', policy_count;
    
    IF policy_count = 8 THEN
        RAISE NOTICE '✅ All storage policies created successfully!';
    ELSE
        RAISE WARNING '⚠️  Expected 8 policies but found %. Check pg_policies table.', policy_count;
    END IF;
END $$;

-- Display all storage policies for verification
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    roles::text[] as "Roles"
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- =============================================================================
-- COMPLETE
-- =============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Storage setup complete!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify the policies in the table above';
    RAISE NOTICE '2. Test document upload in the Document Hub';
    RAISE NOTICE '3. If issues persist, see VERIFY_SUPABASE_CONNECTION.md';
    RAISE NOTICE '=============================================================================';
END $$;
