-- Ensure existing admin accounts have proper roles assigned
-- This migration fixes any existing users who should have admin access but don't

-- Ensure craig@zerobitone.co.za has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::app_role
FROM auth.users au
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure admin@oricol.co.za has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::app_role
FROM auth.users au
WHERE au.email = 'admin@oricol.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure all admin users also have the default 'user' role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT
  user_id,
  'user'::app_role
FROM public.user_roles
WHERE role = 'admin'::app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- Log the current admin users for verification
DO $$
DECLARE
  admin_count INTEGER;
  admin_list TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(p.email, ', ')
  INTO admin_count, admin_list
  FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin'::app_role;
  
  RAISE NOTICE 'Total admin users: %', admin_count;
  RAISE NOTICE 'Admin user emails: %', COALESCE(admin_list, 'No admin users found');
END $$;

-- Add helpful comment
COMMENT ON TABLE public.user_roles IS 'User role assignments. 
Admin accounts are automatically assigned to:
- craig@zerobitone.co.za
- admin@oricol.co.za

All users should also have the default "user" role.';
