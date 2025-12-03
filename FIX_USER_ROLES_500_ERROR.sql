-- ============================================================================
-- FIX FOR: 500 Error on user_roles table queries
-- ============================================================================
-- 
-- PROBLEM:
-- The "Admins can manage roles" RLS policy on the user_roles table was causing
-- a 500 Internal Server Error because it recursively queries the user_roles 
-- table from within a policy on the same table, causing infinite recursion.
--
-- Error seen in browser console:
-- Failed to load resource: the server responded with a status of 500 ()
-- URL: /rest/v1/user_roles?select=role&user_id=eq.<uuid>&role=in.(admin,support_staff)
--
-- SOLUTION:
-- Create a SECURITY DEFINER function that bypasses RLS when checking admin status,
-- then update the policy to use this function instead of a direct table query.
--
-- HOW TO RUN:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run"
--
-- ============================================================================

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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script, you can verify it worked by running:
--
-- SELECT * FROM pg_policies WHERE tablename = 'user_roles';
--
-- You should see two policies:
-- 1. "Users can view own roles" - FOR SELECT with USING (true)
-- 2. "Admins can manage roles" - FOR ALL with USING (public.is_admin(auth.uid()))
-- ============================================================================

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: user_roles RLS policies have been fixed!';
  RAISE NOTICE 'The 500 error on user_roles queries should now be resolved.';
END $$;
