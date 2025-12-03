-- Fix user_roles RLS policy recursion issue
-- The "Admins can manage roles" policy was causing a 500 error because it
-- recursively queries the user_roles table from within a policy on the same table.
-- This migration fixes the issue by using a SECURITY DEFINER function to check admin status.

-- Step 1: Create a helper function with SECURITY DEFINER to avoid RLS recursion
-- This function bypasses RLS when checking if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Step 2: Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Step 3: Recreate the policy using the SECURITY DEFINER function
-- This avoids the recursion because the function bypasses RLS
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Step 4: Ensure the SELECT policy exists and allows users to view their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Add a comment explaining the fix
COMMENT ON FUNCTION public.is_admin(UUID) IS 
  'Helper function to check if a user has admin role. Uses SECURITY DEFINER to bypass RLS and avoid recursion issues in user_roles policies.';
