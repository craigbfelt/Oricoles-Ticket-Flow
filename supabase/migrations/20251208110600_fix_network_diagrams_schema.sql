-- =============================================
-- FIX NETWORK_DIAGRAMS SCHEMA MISMATCH
-- =============================================
-- 
-- PROBLEM:
-- Two migrations attempted to create network_diagrams table:
-- 1. Migration 20251112054548 created it first with old schema (diagram_name, diagram_url, no created_by)
-- 2. Migration 20251113052200 tried to create it again with new schema (name, image_path, created_by)
-- The second CREATE TABLE statement failed silently, leaving the old schema in place.
--
-- This causes the error:
-- "Could not find the 'created_by' column of 'network_diagrams' in the schema cache"
--
-- SOLUTION:
-- Alter the existing table to add missing columns and rename existing ones to match
-- the expected schema from migration 20251113052200.
--

-- Add missing columns (if they don't exist)
ALTER TABLE public.network_diagrams 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.network_diagrams 
  ADD COLUMN IF NOT EXISTS diagram_json JSONB DEFAULT '{}';

ALTER TABLE public.network_diagrams 
  ADD COLUMN IF NOT EXISTS is_company_wide BOOLEAN DEFAULT false;

-- Check if we need to rename columns
-- If diagram_name exists and name doesn't, rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'network_diagrams' 
    AND column_name = 'diagram_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'network_diagrams' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.network_diagrams RENAME COLUMN diagram_name TO name;
  END IF;
END $$;

-- If diagram_url exists and image_path doesn't exist yet, rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'network_diagrams' 
    AND column_name = 'diagram_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'network_diagrams' 
    AND column_name = 'image_path'
  ) THEN
    ALTER TABLE public.network_diagrams RENAME COLUMN diagram_url TO image_path;
  END IF;
END $$;

-- Make branch_id nullable (for company-wide diagrams)
-- This was already done in migration 20251116081115, but we ensure it here as well
ALTER TABLE public.network_diagrams 
  ALTER COLUMN branch_id DROP NOT NULL;

-- Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_network_diagrams_created_by 
  ON public.network_diagrams(created_by);

CREATE INDEX IF NOT EXISTS idx_network_diagrams_is_company_wide 
  ON public.network_diagrams(is_company_wide);

-- Add comments for documentation
COMMENT ON COLUMN public.network_diagrams.created_by IS 'User who created the network diagram';
COMMENT ON COLUMN public.network_diagrams.diagram_json IS 'JSON representation of the network topology (nodes, edges, layout data)';
COMMENT ON COLUMN public.network_diagrams.is_company_wide IS 'True for company-wide diagrams, false for branch-specific diagrams';
COMMENT ON COLUMN public.network_diagrams.image_path IS 'Path to the diagram image file in storage';
COMMENT ON COLUMN public.network_diagrams.name IS 'Name of the network diagram';
COMMENT ON COLUMN public.network_diagrams.branch_id IS 'Branch ID for branch-specific diagrams. NULL for company-wide diagrams.';
