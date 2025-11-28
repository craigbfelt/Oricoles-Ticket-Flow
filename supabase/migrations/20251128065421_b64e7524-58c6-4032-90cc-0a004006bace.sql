-- =============================================
-- MULTI-TENANT ARCHITECTURE MIGRATION (Part 1)
-- Uses global_admins table instead of enum modification
-- =============================================

-- 1. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create global_admins table (users with cross-tenant access)
CREATE TABLE public.global_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 3. Create user_tenant_memberships table
CREATE TABLE public.user_tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 4. Create helper function to check if user is global admin (super_admin)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.global_admins
    WHERE user_id = _user_id
  )
$$;

-- 5. Create helper function to get user's tenant IDs
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(tenant_id), ARRAY[]::uuid[])
  FROM public.user_tenant_memberships
  WHERE user_id = _user_id
$$;

-- 6. Create helper function to check tenant access
CREATE OR REPLACE FUNCTION public.has_tenant_access(_tenant_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = _user_id AND tenant_id = _tenant_id
    )
$$;

-- 7. Create helper function to check tenant role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id uuid, _role app_role, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = _user_id 
        AND tenant_id = _tenant_id 
        AND role = _role
    )
$$;

-- 8. Enable RLS on new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for global_admins (only service role can manage)
CREATE POLICY "Global admins can view themselves" ON public.global_admins
  FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

-- 10. RLS policies for tenants table
CREATE POLICY "Super admins can manage all tenants" ON public.tenants
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    public.is_super_admin() OR
    id = ANY(public.get_user_tenant_ids())
  );

-- 11. RLS policies for user_tenant_memberships
CREATE POLICY "Super admins can manage all memberships" ON public.user_tenant_memberships
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view their own memberships" ON public.user_tenant_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage memberships" ON public.user_tenant_memberships
  FOR ALL USING (
    public.has_tenant_role(tenant_id, 'admin')
  );

-- 12. Indexes for performance
CREATE INDEX idx_user_tenant_memberships_user ON public.user_tenant_memberships(user_id);
CREATE INDEX idx_user_tenant_memberships_tenant ON public.user_tenant_memberships(tenant_id);
CREATE INDEX idx_global_admins_user ON public.global_admins(user_id);

-- 13. Trigger to update updated_at on tenants
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();