-- Fix RLS policies for documents table
-- This migration resolves the "new row violates row level security" error
-- by properly setting up RLS policies for the documents table

-- First, drop all existing policies on the documents table to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;

-- Ensure RLS is enabled on the documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for documents table
-- Allow authenticated users to view all documents
CREATE POLICY "Authenticated users can view all documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert documents
CREATE POLICY "Authenticated users can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (true);

-- Also ensure the service role can bypass RLS for admin operations
-- (service role bypasses RLS by default, but we make this explicit for clarity)
