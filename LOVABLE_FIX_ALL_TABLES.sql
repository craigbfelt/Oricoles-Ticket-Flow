-- ============================================================================
-- FIX ALL TABLE ISSUES - Run this in Lovable SQL Editor
-- ============================================================================
-- This script creates all missing tables and fixes RLS policies for the
-- Shared Files system and User Groups system.
-- 
-- HOW TO RUN THIS ON LOVABLE:
-- 1. Go to your Lovable project
-- 2. Click on "Database" or "Supabase" in the left sidebar
-- 3. Click on "SQL Editor"
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" or "Execute"
-- 
-- This script is safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

-- Create handle_updated_at function if it doesn't exist
-- This function is used by triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create documents table if it doesn't exist (required by shared_files)
-- This table stores metadata about all uploaded documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'documents',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Authenticated users can view all documents'
  ) THEN
    CREATE POLICY "Authenticated users can view all documents"
      ON public.documents FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Authenticated users can upload documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload documents"
      ON public.documents FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Authenticated users can update documents'
  ) THEN
    CREATE POLICY "Authenticated users can update documents"
      ON public.documents FOR UPDATE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Authenticated users can delete documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete documents"
      ON public.documents FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create user groups for organizing users and permissions
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user group members junction table
CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, user_id)
);

-- Create group permissions table for system-level permissions
CREATE TABLE IF NOT EXISTS public.group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  permission_type TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, permission_type)
);

-- Create user permissions table for individual user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_type TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, permission_type)
);

-- Create shared files table for file sharing between users
CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_group UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view' NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (
    (shared_with_user IS NOT NULL AND shared_with_group IS NULL) OR
    (shared_with_user IS NULL AND shared_with_group IS NOT NULL)
  )
);

-- Create shared folders table for organizing shared files
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create shared folder files table
CREATE TABLE IF NOT EXISTS public.shared_folder_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create folder permissions table
CREATE TABLE IF NOT EXISTS public.shared_folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  user_group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_upload BOOLEAN DEFAULT false,
  can_download BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (
    (user_group_id IS NOT NULL AND user_id IS NULL) OR
    (user_group_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON public.group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_document_id ON public.shared_files(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_by ON public.shared_files(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_with_user ON public.shared_files(shared_with_user);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_with_group ON public.shared_files(shared_with_group);
CREATE INDEX IF NOT EXISTS idx_shared_folders_parent ON public.shared_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_created_by ON public.shared_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_folder_files_folder ON public.shared_folder_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_files_uploaded_by ON public.shared_folder_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_folder ON public.shared_folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_group ON public.shared_folder_permissions(user_group_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_user ON public.shared_folder_permissions(user_id);

-- Enable RLS on all tables
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_permissions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies to ensure they're correct
-- User Groups Policies
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.user_groups;
CREATE POLICY "Authenticated users can view groups"
  ON public.user_groups FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage groups" ON public.user_groups;
CREATE POLICY "Admins can manage groups"
  ON public.user_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Group Members Policies
DROP POLICY IF EXISTS "Users can view group memberships" ON public.user_group_members;
CREATE POLICY "Users can view group memberships"
  ON public.user_group_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage group memberships" ON public.user_group_members;
CREATE POLICY "Admins can manage group memberships"
  ON public.user_group_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Group Permissions Policies
DROP POLICY IF EXISTS "Users can view group permissions" ON public.group_permissions;
CREATE POLICY "Users can view group permissions"
  ON public.group_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage group permissions" ON public.group_permissions;
CREATE POLICY "Admins can manage group permissions"
  ON public.group_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Permissions Policies
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Shared Files Policies
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.shared_files;
CREATE POLICY "Users can view files shared with them"
  ON public.shared_files FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR shared_with_user = auth.uid()
    OR shared_with_group IN (
      SELECT group_id FROM public.user_group_members
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can share files" ON public.shared_files;
CREATE POLICY "Users can share files"
  ON public.shared_files FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage their shares" ON public.shared_files;
CREATE POLICY "Users can manage their shares"
  ON public.shared_files FOR UPDATE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete their shares" ON public.shared_files;
CREATE POLICY "Users can delete their shares"
  ON public.shared_files FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Shared Folders Policies
DROP POLICY IF EXISTS "Users can view folders they have permission to" ON public.shared_folders;
CREATE POLICY "Users can view folders they have permission to"
  ON public.shared_folders FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can see folders they have permission to view
    EXISTS (
      SELECT 1 FROM public.shared_folder_permissions
      WHERE folder_id = shared_folders.id
      AND can_view = true
      AND (
        user_id = auth.uid()
        OR user_group_id IN (
          SELECT group_id FROM public.user_group_members
          WHERE user_id = auth.uid()
        )
      )
    )
    OR
    -- Users can see folders they created
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can manage folders" ON public.shared_folders;
CREATE POLICY "Admins can manage folders"
  ON public.shared_folders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Shared Folder Files Policies
DROP POLICY IF EXISTS "Users can view files in accessible folders" ON public.shared_folder_files;
CREATE POLICY "Users can view files in accessible folders"
  ON public.shared_folder_files FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can see files in folders they have view permission to
    EXISTS (
      SELECT 1 FROM public.shared_folder_permissions
      WHERE folder_id = shared_folder_files.folder_id
      AND can_view = true
      AND (
        user_id = auth.uid()
        OR user_group_id IN (
          SELECT group_id FROM public.user_group_members
          WHERE user_id = auth.uid()
        )
      )
    )
    OR
    -- Users can see files they uploaded
    uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can upload files to folders with permission" ON public.shared_folder_files;
CREATE POLICY "Users can upload files to folders with permission"
  ON public.shared_folder_files FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can upload anywhere
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can upload to folders they have upload permission to
    EXISTS (
      SELECT 1 FROM public.shared_folder_permissions
      WHERE folder_id = shared_folder_files.folder_id
      AND can_upload = true
      AND (
        user_id = auth.uid()
        OR user_group_id IN (
          SELECT group_id FROM public.user_group_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete files with permission" ON public.shared_folder_files;
CREATE POLICY "Users can delete files with permission"
  ON public.shared_folder_files FOR DELETE
  TO authenticated
  USING (
    -- Admins can delete anything
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can delete files in folders they have delete permission to
    EXISTS (
      SELECT 1 FROM public.shared_folder_permissions
      WHERE folder_id = shared_folder_files.folder_id
      AND can_delete = true
      AND (
        user_id = auth.uid()
        OR user_group_id IN (
          SELECT group_id FROM public.user_group_members
          WHERE user_id = auth.uid()
        )
      )
    )
    OR
    -- Users can delete their own uploads
    uploaded_by = auth.uid()
  );

-- Shared Folder Permissions Policies
DROP POLICY IF EXISTS "Admins and users can view permissions" ON public.shared_folder_permissions;
CREATE POLICY "Admins and users can view permissions"
  ON public.shared_folder_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
    OR user_group_id IN (
      SELECT group_id FROM public.user_group_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.shared_folder_permissions;
CREATE POLICY "Admins can manage permissions"
  ON public.shared_folder_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.user_groups IS 'User groups for organizing users and managing permissions';
COMMENT ON TABLE public.user_group_members IS 'Junction table for user group membership';
COMMENT ON TABLE public.group_permissions IS 'System permissions granted to user groups';
COMMENT ON TABLE public.user_permissions IS 'Individual user permissions for system features';
COMMENT ON TABLE public.shared_files IS 'File sharing between users and groups';
COMMENT ON TABLE public.shared_folders IS 'Folder structure for organizing shared files';
COMMENT ON TABLE public.shared_folder_files IS 'Files stored in shared folders';
COMMENT ON TABLE public.shared_folder_permissions IS 'Permissions for accessing shared folders';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ All required functions created!';
  RAISE NOTICE '✅ Documents table verified/created!';
  RAISE NOTICE '✅ User Groups tables created successfully!';
  RAISE NOTICE '✅ Shared Files tables created successfully!';
  RAISE NOTICE '✅ Shared Folders tables created successfully!';
  RAISE NOTICE '✅ All RLS policies configured!';
  RAISE NOTICE '✅ All indexes and triggers added!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Setup Complete! You can now:';
  RAISE NOTICE '  - Create user groups';
  RAISE NOTICE '  - Create shared folders';
  RAISE NOTICE '  - Share files with users and groups';
  RAISE NOTICE '============================================================';
END $$;
