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
CREATE INDEX IF NOT EXISTS idx_shared_folders_parent ON public.shared_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_created_by ON public.shared_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_folder_files_folder ON public.shared_folder_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_files_uploaded_by ON public.shared_folder_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_folder ON public.shared_folder_permissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_group ON public.shared_folder_permissions(user_group_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_permissions_user ON public.shared_folder_permissions(user_id);

-- Enable RLS
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_folders
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

-- RLS Policies for shared_folder_files
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

-- RLS Policies for shared_folder_permissions
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

-- Add triggers for updated_at
CREATE TRIGGER update_shared_folders_updated_at
  BEFORE UPDATE ON public.shared_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shared_folder_files_updated_at
  BEFORE UPDATE ON public.shared_folder_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shared_folder_permissions_updated_at
  BEFORE UPDATE ON public.shared_folder_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.shared_folders IS 'Folder structure for organizing shared files';
COMMENT ON TABLE public.shared_folder_files IS 'Files stored in shared folders';
COMMENT ON TABLE public.shared_folder_permissions IS 'Permissions for accessing shared folders';
COMMENT ON COLUMN public.shared_folders.parent_folder_id IS 'Parent folder for nested folder structure';
COMMENT ON COLUMN public.shared_folder_permissions.can_view IS 'Permission to view folder contents';
COMMENT ON COLUMN public.shared_folder_permissions.can_upload IS 'Permission to upload files to folder';
COMMENT ON COLUMN public.shared_folder_permissions.can_download IS 'Permission to download files from folder';
COMMENT ON COLUMN public.shared_folder_permissions.can_delete IS 'Permission to delete files from folder';
