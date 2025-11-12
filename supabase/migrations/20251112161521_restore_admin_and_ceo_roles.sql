-- Migration to restore admin access for craig@zerobitone.co.za
-- and assign CEO role to Graeme Smart
-- This ensures proper access control for system administrators

-- First, ensure craig@zerobitone.co.za has admin role
-- This handles both existing and future user accounts
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::app_role
FROM auth.users au
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure Graeme Smart has CEO role
-- This will work once Graeme Smart's account is created
-- You'll need to update this with the correct email for Graeme Smart
-- For now, using a placeholder - update with actual email
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'ceo'::app_role
FROM auth.users au
WHERE au.email ILIKE '%graeme%smart%' 
   OR au.email ILIKE '%smart%graeme%'
   OR au.full_name ILIKE '%graeme%smart%'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update the handle_new_user function to automatically assign roles
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
  
  -- Automatically assign CEO role to Graeme Smart
  -- Update the email condition when you know the exact email
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

-- Add a comment explaining the role structure
COMMENT ON TABLE public.user_roles IS 'User roles for access control:
- admin: Full access to everything including System Users
- ceo: Full access to everything EXCEPT System Users
- support_staff: Access to Users, Reports, VPN, RDP, Remote Support
- user: Access to Tickets and Remote Support only';
