-- =============================================
-- Fix handle_new_user to assign users to default tenant
-- =============================================
-- 
-- Issue: New users created through import-staff-users edge function
-- don't get assigned to any tenant, causing "tenant not found" errors
-- in subsequent operations like CSV import.
--
-- Solution: Update handle_new_user() trigger to automatically assign
-- new users to the default tenant with default membership.

-- First, backfill any existing users who don't have tenant membership
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_default)
SELECT 
  p.user_id,
  '00000000-0000-0000-0000-000000000001', -- Default tenant ID
  'user', -- Default role
  true -- Set as default tenant
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenant_memberships utm 
  WHERE utm.user_id = p.user_id
)
ON CONFLICT (user_id, tenant_id) DO UPDATE
SET is_default = true
WHERE user_tenant_memberships.user_id = EXCLUDED.user_id
  AND NOT EXISTS (
    SELECT 1 FROM user_tenant_memberships utm2
    WHERE utm2.user_id = EXCLUDED.user_id
      AND utm2.is_default = true
  );

-- Update handle_new_user function to assign new users to default tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Create profile for the new user
  -- Use ON CONFLICT to handle race conditions
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  
  -- Assign user to default tenant
  -- This is critical for multi-tenant operations
  INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_default)
  VALUES (
    NEW.id,
    default_tenant_id,
    'user'::app_role,
    true
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_default = true
  WHERE user_tenant_memberships.user_id = EXCLUDED.user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_tenant_memberships utm
      WHERE utm.user_id = EXCLUDED.user_id
        AND utm.is_default = true
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
  
  -- Automatically assign admin role to admin@zerobitone.co.za
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates profile, assigns user to default tenant, and assigns appropriate roles for new users';
