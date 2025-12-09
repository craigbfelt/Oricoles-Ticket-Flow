-- Fix directory_users RLS policy to allow users to view their own profile
-- This fixes the issue where non-admin users cannot see user icons on the Dashboard

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Staff can view directory users" ON directory_users;

-- Create new policies that allow:
-- 1. Staff (admin/support_staff) to view all directory users
-- 2. Regular users to view their own directory user record by email

CREATE POLICY "Staff can view all directory users" ON directory_users
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can view own directory user by email" ON directory_users
  FOR SELECT TO authenticated
  USING (
    email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );
