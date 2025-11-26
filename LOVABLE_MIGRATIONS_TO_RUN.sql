-- =============================================================================
-- LOVABLE DATABASE MIGRATIONS
-- =============================================================================
-- These migrations need to be run on your Lovable Supabase instance
-- after merging PR #8 (copilot/enable-image-text-extraction)
--
-- Run these in order in the Supabase SQL Editor:
-- 1. Go to your Lovable project's Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste each section below
-- 4. Execute each section in order
-- =============================================================================


-- =============================================================================
-- MIGRATION 1: Create User Document Boxes
-- =============================================================================
-- Creates user_document_boxes table to track user document folders with 
-- sequential numbers for the Document Hub

-- Create user_document_boxes table to track user document folders with sequential numbers
CREATE TABLE IF NOT EXISTS public.user_document_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  box_number INTEGER NOT NULL UNIQUE,
  display_name TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  total_storage_bytes BIGINT NOT NULL DEFAULT 0,
  last_upload_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create sequence for box numbers (starting at 1)
CREATE SEQUENCE IF NOT EXISTS public.user_box_number_seq START WITH 1 INCREMENT BY 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_document_boxes_user_id ON public.user_document_boxes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_document_boxes_box_number ON public.user_document_boxes(box_number);

-- Enable RLS on user_document_boxes table
ALTER TABLE public.user_document_boxes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_document_boxes
-- All authenticated users can view all boxes (for the grid display)
CREATE POLICY "Authenticated users can view all document boxes"
  ON public.user_document_boxes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own box record
CREATE POLICY "Users can insert own document box"
  ON public.user_document_boxes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own box record
CREATE POLICY "Users can update own document box"
  ON public.user_document_boxes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update any box records
CREATE POLICY "Admins can update all document boxes"
  ON public.user_document_boxes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any box records
CREATE POLICY "Admins can delete document boxes"
  ON public.user_document_boxes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_user_document_boxes_updated_at
  BEFORE UPDATE ON public.user_document_boxes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create user box
CREATE OR REPLACE FUNCTION public.get_or_create_user_box(p_user_id UUID)
RETURNS public.user_document_boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.user_document_boxes;
  v_profile public.profiles;
BEGIN
  -- Check if box exists
  SELECT * INTO v_box FROM public.user_document_boxes WHERE user_id = p_user_id;
  
  IF v_box.id IS NOT NULL THEN
    RETURN v_box;
  END IF;
  
  -- Get user profile for display name
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  -- Create new box with next sequence number
  INSERT INTO public.user_document_boxes (user_id, box_number, display_name)
  VALUES (
    p_user_id,
    nextval('public.user_box_number_seq'),
    COALESCE(v_profile.full_name, 'User')
  )
  RETURNING * INTO v_box;
  
  RETURN v_box;
END;
$$;

-- Function to update user box stats when document is uploaded
CREATE OR REPLACE FUNCTION public.update_user_box_on_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.user_document_boxes;
BEGIN
  -- Get or create user box
  SELECT * INTO v_box FROM public.get_or_create_user_box(NEW.uploaded_by);
  
  -- Update box stats
  UPDATE public.user_document_boxes
  SET 
    document_count = document_count + 1,
    total_storage_bytes = total_storage_bytes + COALESCE(NEW.file_size, 0),
    last_upload_at = now(),
    updated_at = now()
  WHERE user_id = NEW.uploaded_by;
  
  RETURN NEW;
END;
$$;

-- Function to update user box stats when document is deleted
CREATE OR REPLACE FUNCTION public.update_user_box_on_document_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update box stats
  UPDATE public.user_document_boxes
  SET 
    document_count = GREATEST(document_count - 1, 0),
    total_storage_bytes = GREATEST(total_storage_bytes - COALESCE(OLD.file_size, 0), 0),
    updated_at = now()
  WHERE user_id = OLD.uploaded_by;
  
  RETURN OLD;
END;
$$;

-- Create triggers on documents table
DROP TRIGGER IF EXISTS update_user_box_on_document_insert ON public.documents;
CREATE TRIGGER update_user_box_on_document_insert
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_box_on_document_upload();

DROP TRIGGER IF EXISTS update_user_box_on_document_delete ON public.documents;
CREATE TRIGGER update_user_box_on_document_delete
  BEFORE DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_box_on_document_delete();

-- Initialize boxes for existing users who have uploaded documents
INSERT INTO public.user_document_boxes (user_id, box_number, display_name, document_count, total_storage_bytes, last_upload_at)
SELECT 
  d.uploaded_by,
  nextval('public.user_box_number_seq'),
  COALESCE(p.full_name, 'User'),
  COUNT(d.id),
  COALESCE(SUM(d.file_size), 0),
  MAX(d.created_at)
FROM public.documents d
LEFT JOIN public.profiles p ON d.uploaded_by = p.id
WHERE d.uploaded_by IS NOT NULL
GROUP BY d.uploaded_by, p.full_name
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.user_document_boxes IS 'Tracks user document folders with sequential box numbers for the Document Hub';
COMMENT ON COLUMN public.user_document_boxes.box_number IS 'Unique sequential number assigned to each user for their document box';
COMMENT ON COLUMN public.user_document_boxes.display_name IS 'Display name for the box (usually user full name)';
COMMENT ON COLUMN public.user_document_boxes.document_count IS 'Number of documents uploaded by this user';
COMMENT ON COLUMN public.user_document_boxes.total_storage_bytes IS 'Total storage used by user documents in bytes';


-- =============================================================================
-- MIGRATION 2: Create Staff Members Table
-- =============================================================================
-- Creates staff_members table for staff directory records (not login users)

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  job_title TEXT,
  phone TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_members_full_name ON public.staff_members(full_name);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON public.staff_members(email);
CREATE INDEX IF NOT EXISTS idx_staff_members_branch_id ON public.staff_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_status ON public.staff_members(status);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view staff
CREATE POLICY "Authenticated users can view staff members"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert staff members
CREATE POLICY "Admins can insert staff members"
  ON public.staff_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update staff members
CREATE POLICY "Admins can update staff members"
  ON public.staff_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete staff members
CREATE POLICY "Admins can delete staff members"
  ON public.staff_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.staff_members IS 'Staff directory records - these are not login users, just employee records';
COMMENT ON COLUMN public.staff_members.status IS 'Staff member status: active, inactive, on_leave';


-- =============================================================================
-- MIGRATION 3: Create Platform Credentials Table
-- =============================================================================
-- Creates platform_credentials table for storing credentials across different platforms
-- SECURITY NOTE: Passwords are stored as-is in this version. 
-- For production deployment, consider implementing:
-- 1. Application-level encryption before storing
-- 2. pgcrypto extension for database-level encryption
-- 3. Vault integration for secrets management

CREATE TABLE IF NOT EXISTS public.platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- bluewave, sage, microsoft365, active_directory, qwerti, general
  provider TEXT NOT NULL, -- microsoft365, qwerti, active_directory, oricol_rdp, sage, bluewave, other
  credential_type TEXT NOT NULL, -- rdp, active_directory, email, api, database, admin, other
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- SECURITY: Should be encrypted in production environment
  email TEXT,
  server_url TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform ON public.platform_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_provider ON public.platform_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_type ON public.platform_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_is_active ON public.platform_credentials(is_active);

-- Enable RLS
ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins and CEO can view credentials (sensitive data)
CREATE POLICY "Admins can view all platform credentials"
  ON public.platform_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
    )
  );

-- Only admins can insert credentials
CREATE POLICY "Admins can insert platform credentials"
  ON public.platform_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update credentials
CREATE POLICY "Admins can update platform credentials"
  ON public.platform_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete credentials
CREATE POLICY "Admins can delete platform credentials"
  ON public.platform_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_platform_credentials_updated_at
  BEFORE UPDATE ON public.platform_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.platform_credentials IS 'Stores login credentials for various platforms like RDP, Active Directory, Email, etc.';
COMMENT ON COLUMN public.platform_credentials.platform IS 'The platform/page this credential belongs to (bluewave, sage, microsoft365, etc.)';
COMMENT ON COLUMN public.platform_credentials.provider IS 'The service provider (Microsoft 365, Qwerti, Active Directory, Oricol RDP, etc.)';
COMMENT ON COLUMN public.platform_credentials.credential_type IS 'Type of credential: rdp, active_directory, email, api, database, admin, other';
COMMENT ON COLUMN public.platform_credentials.password IS 'Password - should be encrypted in production environment';


-- =============================================================================
-- VERIFICATION QUERIES (Run after migrations to verify success)
-- =============================================================================

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_document_boxes', 'staff_members', 'platform_credentials');

-- Check row counts (should be 0 or initialized data)
SELECT 
  (SELECT COUNT(*) FROM public.user_document_boxes) as user_boxes_count,
  (SELECT COUNT(*) FROM public.staff_members) as staff_count,
  (SELECT COUNT(*) FROM public.platform_credentials) as credentials_count;
