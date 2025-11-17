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
  permission_type TEXT NOT NULL, -- 'tickets', 'document_hub', 'users', 'assets', etc.
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, permission_type)
);

-- Create shared files table for file sharing between users
CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_group UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view' NOT NULL, -- 'view', 'edit', 'download'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (
    (shared_with_user IS NOT NULL AND shared_with_group IS NULL) OR
    (shared_with_user IS NULL AND shared_with_group IS NOT NULL)
  )
);

-- Create user permissions table for individual user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_type TEXT NOT NULL, -- 'tickets', 'document_hub', 'users', 'assets', etc.
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, permission_type)
);

-- Add page/location field to documents for cross-page organization
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS page_location TEXT, -- 'network_diagrams', 'branch_files', 'assets', 'jobs', 'general'
ADD COLUMN IF NOT EXISTS moved_from TEXT,
ADD COLUMN IF NOT EXISTS moved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON public.group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_document_id ON public.shared_files(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_by ON public.shared_files(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_with_user ON public.shared_files(shared_with_user);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_with_group ON public.shared_files(shared_with_group);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_page_location ON public.documents(page_location);

-- Enable RLS on all new tables
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_groups
CREATE POLICY "Authenticated users can view groups"
  ON public.user_groups FOR SELECT
  TO authenticated
  USING (true);

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

-- RLS Policies for user_group_members
CREATE POLICY "Users can view group memberships"
  ON public.user_group_members FOR SELECT
  TO authenticated
  USING (true);

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

-- RLS Policies for group_permissions
CREATE POLICY "Users can view group permissions"
  ON public.group_permissions FOR SELECT
  TO authenticated
  USING (true);

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

-- RLS Policies for shared_files
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

-- RLS Policies for user_permissions
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

-- Add triggers for updated_at
CREATE TRIGGER update_user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.user_groups IS 'User groups for organizing users and managing permissions';
COMMENT ON TABLE public.user_group_members IS 'Junction table for user group membership';
COMMENT ON TABLE public.group_permissions IS 'System permissions granted to user groups';
COMMENT ON TABLE public.shared_files IS 'File sharing between users and groups';
COMMENT ON TABLE public.user_permissions IS 'Individual user permissions for system features';
COMMENT ON COLUMN public.documents.page_location IS 'Page where the document is displayed (e.g., network_diagrams, branch_files)';
COMMENT ON COLUMN public.documents.moved_from IS 'Previous location if document was moved';
COMMENT ON COLUMN public.documents.moved_at IS 'Timestamp when document was moved';
COMMENT ON COLUMN public.documents.moved_by IS 'User who moved the document';
