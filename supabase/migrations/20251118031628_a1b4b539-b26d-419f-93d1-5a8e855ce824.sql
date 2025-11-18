-- ============================================================================
-- COMPREHENSIVE FIX: Create all missing tables and functions
-- This creates shared_folders, user_groups, and the import function
-- ============================================================================

-- 1. USER GROUPS SYSTEM
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'read',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, resource_type, resource_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission_level TEXT NOT NULL DEFAULT 'read',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, resource_type, resource_id)
);

-- 2. SHARED FILES SYSTEM
CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  CONSTRAINT shared_with_check CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);

-- 3. SHARED FOLDERS SYSTEM
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (name, parent_folder_id, created_by)
);

CREATE TABLE IF NOT EXISTS public.shared_folder_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (folder_id, document_id)
);

CREATE TABLE IF NOT EXISTS public.shared_folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'read',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT folder_perm_check CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
  ),
  UNIQUE (folder_id, user_id, group_id)
);

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_group_members_group ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_user ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_perms_group ON public.group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_document ON public.shared_files(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_user ON public.shared_files(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_group ON public.shared_files(shared_with_group_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_parent ON public.shared_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_created_by ON public.shared_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_folder_files_folder ON public.shared_folder_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_files_document ON public.shared_folder_files(document_id);
CREATE INDEX IF NOT EXISTS idx_folder_perms_folder ON public.shared_folder_permissions(folder_id);

-- 5. ENABLE RLS ON ALL TABLES
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folder_permissions ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES (Simple authenticated access for now)
CREATE POLICY "Authenticated users can view groups" ON public.user_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.user_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update groups" ON public.user_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete groups" ON public.user_groups FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view members" ON public.user_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add members" ON public.user_group_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove members" ON public.user_group_members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view shared files" ON public.shared_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can share files" ON public.shared_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shares" ON public.shared_files FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete shares" ON public.shared_files FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view folders" ON public.shared_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create folders" ON public.shared_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update folders" ON public.shared_folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete folders" ON public.shared_folders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view folder files" ON public.shared_folder_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can add folder files" ON public.shared_folder_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove folder files" ON public.shared_folder_files FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view folder perms" ON public.shared_folder_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can grant folder perms" ON public.shared_folder_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can revoke folder perms" ON public.shared_folder_permissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view group perms" ON public.group_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can grant group perms" ON public.group_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can revoke group perms" ON public.group_permissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view user perms" ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can grant user perms" ON public.user_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can revoke user perms" ON public.user_permissions FOR DELETE TO authenticated USING (true);

-- 7. CREATE TRIGGERS FOR updated_at
CREATE TRIGGER update_user_groups_updated_at BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shared_folders_updated_at BEFORE UPDATE ON public.shared_folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. CREATE IMPORT FUNCTION
CREATE OR REPLACE FUNCTION public.import_system_users_from_staff(
  staff_user_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  staff_id UUID;
  staff_user RECORD;
  results JSONB[] := ARRAY[]::JSONB[];
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOREACH staff_id IN ARRAY staff_user_ids LOOP
    BEGIN
      -- Get staff user details
      SELECT * INTO staff_user
      FROM public.vpn_rdp_credentials
      WHERE id = staff_id;

      IF NOT FOUND THEN
        results := array_append(results, jsonb_build_object(
          'id', staff_id,
          'success', false,
          'error', 'Staff user not found'
        ));
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Check if user already exists
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = staff_user.email) THEN
        results := array_append(results, jsonb_build_object(
          'id', staff_id,
          'email', staff_user.email,
          'success', false,
          'error', 'User already exists'
        ));
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Return user data (actual creation happens in edge function)
      results := array_append(results, jsonb_build_object(
        'id', staff_id,
        'email', staff_user.email,
        'username', staff_user.username,
        'success', true
      ));
      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      results := array_append(results, jsonb_build_object(
        'id', staff_id,
        'success', false,
        'error', SQLERRM
      ));
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', array_length(staff_user_ids, 1),
    'success_count', success_count,
    'error_count', error_count,
    'results', to_jsonb(results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;