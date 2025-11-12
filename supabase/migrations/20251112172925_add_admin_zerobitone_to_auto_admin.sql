-- Migration to add admin@zerobitone.co.za to auto-admin assignment
-- This fixes the issue where admin@zerobitone.co.za users only see Dashboard and Remote Support
-- 
-- This migration does two things:
-- 1. Updates the handle_new_user() trigger to auto-assign admin role to admin@zerobitone.co.za
-- 2. Assigns admin role to any existing admin@zerobitone.co.za accounts

-- Update handle_new_user to automatically assign admin role for admin@zerobitone.co.za
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for the new user
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Automatically assign admin role to craig@zerobitone.co.za
  IF NEW.email = 'craig@zerobitone.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Automatically assign admin role to admin@oricol.co.za
  IF NEW.email = 'admin@oricol.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Automatically assign admin role to admin@zerobitone.co.za (NEW)
  IF NEW.email = 'admin@zerobitone.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Automatically assign CEO role to Graeme Smart
  IF NEW.email ILIKE '%graeme%smart%' 
     OR NEW.email ILIKE '%smart%graeme%'
     OR LOWER(COALESCE(NEW.raw_user_meta_data->>'full_name', '')) LIKE '%graeme%smart%' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'ceo'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Assign default 'user' role to all users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Assign admin role to existing admin@zerobitone.co.za accounts
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'admin@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update function comment to reflect the change
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that assigns roles to new users. Auto-assigns admin role to craig@zerobitone.co.za, admin@oricol.co.za, and admin@zerobitone.co.za';
