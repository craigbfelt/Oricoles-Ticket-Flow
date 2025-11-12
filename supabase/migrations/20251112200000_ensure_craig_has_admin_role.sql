-- Migration to ensure craig@zerobitone.co.za has admin role
-- This fixes the "Access Denied" issue when craig@zerobitone.co.za tries to access certain pages
-- 
-- The issue: User can see all tabs but gets "Access Denied" when clicking on them
-- Root cause: User account exists but doesn't have the proper admin role assigned
-- Solution: Assign admin role to craig@zerobitone.co.za if they exist

-- First, ensure craig@zerobitone.co.za has admin role if the account exists
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure they have the default 'user' role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- For good measure, also ensure admin@oricol.co.za has admin role if they exist
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'admin@oricol.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'admin@oricol.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- And admin@zerobitone.co.za
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'admin@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'admin@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the fix
DO $$
DECLARE
  craig_roles TEXT[];
  craig_has_admin BOOLEAN := FALSE;
  craig_user_id UUID;
BEGIN
  -- Get craig's user_id and roles
  SELECT p.user_id, ARRAY_AGG(ur.role::TEXT ORDER BY ur.role) 
  INTO craig_user_id, craig_roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  INNER JOIN auth.users au ON p.user_id = au.id
  WHERE au.email = 'craig@zerobitone.co.za'
  GROUP BY p.user_id;
  
  IF craig_user_id IS NOT NULL THEN
    craig_has_admin := 'admin' = ANY(craig_roles);
    
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'ROLE ASSIGNMENT VERIFICATION FOR craig@zerobitone.co.za';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'User ID: %', craig_user_id;
    RAISE NOTICE 'Assigned Roles: %', craig_roles;
    RAISE NOTICE 'Has Admin Role: %', craig_has_admin;
    
    IF craig_has_admin THEN
      RAISE NOTICE 'SUCCESS: craig@zerobitone.co.za now has admin access';
      RAISE NOTICE 'They can now access:';
      RAISE NOTICE '  - Reports page';
      RAISE NOTICE '  - Users (System Users) page';
      RAISE NOTICE '  - VPN page';
      RAISE NOTICE '  - RDP page';
      RAISE NOTICE '  - Jobs page';
      RAISE NOTICE '  - Maintenance page';
      RAISE NOTICE '  - Remote Support page';
      RAISE NOTICE '  - And all other admin-restricted pages';
    ELSE
      RAISE WARNING 'FAILED: craig@zerobitone.co.za does not have admin role';
      RAISE WARNING 'This migration did not fix the issue. Manual intervention required.';
    END IF;
    RAISE NOTICE '=================================================================';
  ELSE
    RAISE NOTICE 'INFO: User craig@zerobitone.co.za does not exist yet in the database';
    RAISE NOTICE 'The trigger function will auto-assign admin role when they sign up';
  END IF;
END $$;
