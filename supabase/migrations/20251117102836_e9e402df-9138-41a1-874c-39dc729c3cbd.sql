-- EMERGENCY FIX: Prevent privilege escalation on user_roles table
-- Drop catastrophically permissive policies that allow any user to grant themselves admin

DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON public.user_roles;

-- Policy 1: Users can only view their OWN roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Only service_role (backend functions) can modify roles
-- This prevents direct client manipulation of roles
CREATE POLICY "Service role can manage all roles"
  ON public.user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Admins can view all role assignments (for admin UI)
-- Uses the existing has_role() security definer function to avoid recursion
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Verify no malicious role assignments exist
-- Run this query after applying the migration to check for unauthorized admins
-- SELECT u.email, ur.role, ur.created_at 
-- FROM user_roles ur
-- JOIN auth.users u ON u.id = ur.user_id
-- WHERE ur.role = 'admin'
-- ORDER BY ur.created_at DESC;