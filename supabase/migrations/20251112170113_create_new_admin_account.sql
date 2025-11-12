-- Migration to create a new admin account
-- This creates a new admin user account with full permissions
-- 
-- Default credentials:
-- Email: admin@oricol.co.za
-- Password: AdminPassword2024!
-- 
-- IMPORTANT: Change the password immediately after first login

-- Create a new admin user account
-- Note: In Supabase, we need to insert into auth.users which requires superuser access
-- This is typically done through the Supabase dashboard or API
-- For local development, you can use supabase CLI or dashboard
-- For production, use the Supabase dashboard to create the user, then run this migration to assign roles

-- Function to create admin user if email doesn't exist yet
-- This will be called automatically by the trigger when a user signs up
CREATE OR REPLACE FUNCTION public.ensure_admin_account()
RETURNS void AS $$
DECLARE
  admin_email TEXT := 'admin@oricol.co.za';
  admin_user_id UUID;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;
  
  -- If user exists, ensure they have admin role
  IF admin_user_id IS NOT NULL THEN
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (admin_user_id, 'System Administrator', admin_email)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        email = EXCLUDED.email;
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also ensure user role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin account ensured for %', admin_email;
  ELSE
    RAISE NOTICE 'Admin user % not found in auth.users. Please create the user account first.', admin_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_new_user to automatically assign admin role for the new admin email
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

-- Try to ensure admin account exists (will only work if user already created)
SELECT public.ensure_admin_account();

-- Add helpful comments
COMMENT ON FUNCTION public.ensure_admin_account() IS 'Ensures admin@oricol.co.za account has admin role. User must be created through Supabase Auth first.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that assigns roles to new users. Auto-assigns admin role to craig@zerobitone.co.za and admin@oricol.co.za';
