-- Create documents table for Document Hub
-- This table stores metadata about all uploaded documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL, -- System-generated filename
  original_filename text NOT NULL, -- Original filename from user
  file_type text NOT NULL, -- MIME type (e.g., application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  file_size bigint NOT NULL, -- File size in bytes
  storage_path text NOT NULL, -- Path in storage bucket
  storage_bucket text NOT NULL DEFAULT 'documents', -- Bucket name (documents or diagrams)
  category text NOT NULL DEFAULT 'general', -- Category: general, image, pdf, word, excel, etc.
  description text, -- User-provided description
  tags text[], -- Array of tags for categorization
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table
CREATE POLICY "Authenticated users can view all documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (true);

-- Create the documents storage bucket for storing actual document files
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
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload documents to storage" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents from storage" ON storage.objects;

-- Create storage policies for documents bucket
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

-- Add comments for documentation
COMMENT ON TABLE public.documents IS 'Stores metadata for all documents uploaded to the Document Hub';
COMMENT ON COLUMN public.documents.filename IS 'System-generated unique filename';
COMMENT ON COLUMN public.documents.original_filename IS 'Original filename provided by user';
COMMENT ON COLUMN public.documents.storage_path IS 'Full path to file in storage bucket';
COMMENT ON COLUMN public.documents.category IS 'Document category: general, image, pdf, word, excel, powerpoint, etc.';
