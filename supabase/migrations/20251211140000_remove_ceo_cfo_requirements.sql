-- =============================================
-- Remove CEO/CFO role requirements and simplify tenant handling
-- =============================================
-- 
-- This migration removes CEO/CFO role logic that was causing issues
-- and simplifies the system to not require tenant assignments

-- Update handle_new_user function to remove CEO/CFO role assignments
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
  
  -- Assign user to default tenant (optional - will not fail if tenant doesn't exist)
  BEGIN
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
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- Tenant doesn't exist, skip tenant assignment
      RAISE NOTICE 'Tenant % does not exist, skipping tenant assignment for user %', default_tenant_id, NEW.id;
    WHEN OTHERS THEN
      -- Log other errors but don't fail user creation
      RAISE WARNING 'Error assigning tenant for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Automatically assign admin role to specific admin accounts
  IF NEW.email = 'craig@zerobitone.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  IF NEW.email = 'admin@oricol.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  IF NEW.email = 'admin@zerobitone.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
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
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates profile, optionally assigns user to default tenant if it exists, and assigns appropriate roles for new users. CEO/CFO role logic removed.';

-- Note: We are NOT removing the CEO/CFO roles from the enum as that could break existing data
-- We are just removing the automatic assignment logic
