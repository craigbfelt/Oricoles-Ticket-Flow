-- Allow CEO role to view and manage all profiles and user roles
-- This enables CEOs to fully manage all system users in the Users page

-- Drop the existing restrictive policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policy that allows admin, CEO, and support_staff to view all profiles
CREATE POLICY "Admins, CEOs, and support staff can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'support_staff')
  );

-- Allow admins, CEOs, and support_staff to update profiles
CREATE POLICY "Admins, CEOs, and support staff can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'support_staff')
  );

-- Allow admin, CEO, and support_staff to view all user roles (not just their own)
-- This is needed for the Users page to display role information for all users
CREATE POLICY "Admins, CEOs, and support staff can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'support_staff')
  );

-- Allow admins, CEOs, and support_staff to delete user roles
-- This is needed for updating user roles (delete old, insert new)
CREATE POLICY "Admins, CEOs, and support staff can delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'support_staff')
  );

-- Update the existing INSERT policy to include CEOs and support_staff
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins, CEOs, and support staff can insert user roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'support_staff')
  );
