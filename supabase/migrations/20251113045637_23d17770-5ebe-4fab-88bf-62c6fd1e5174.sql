-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Allow authenticated users to view all roles (needed for the UI)
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert roles
CREATE POLICY "Authenticated users can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete roles
CREATE POLICY "Authenticated users can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to update roles
CREATE POLICY "Authenticated users can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (true);