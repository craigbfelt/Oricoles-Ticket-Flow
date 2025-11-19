-- Security fix: Add search_path protection to SECURITY DEFINER functions
-- This prevents search_path manipulation attacks on privileged functions

-- Fix generate_random_password function
CREATE OR REPLACE FUNCTION public.generate_random_password(length INTEGER DEFAULT 16)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix create_system_user_from_staff function
CREATE OR REPLACE FUNCTION public.create_system_user_from_staff(
  staff_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  staff_user RECORD;
  new_user_id UUID;
  random_password TEXT;
  result JSONB;
BEGIN
  -- Get staff user details
  SELECT * INTO staff_user
  FROM public.vpn_rdp_credentials
  WHERE id = staff_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Staff user not found'
    );
  END IF;

  -- Check if user already exists with this email
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = staff_user.email
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already exists with this email'
    );
  END IF;

  -- Generate random password
  random_password := public.generate_random_password(16);

  -- Create auth user (this would normally be done via Supabase Auth API)
  -- Note: This is a placeholder - actual user creation should be done via Supabase Auth Admin API
  -- For now, we'll return the data needed to create the user
  
  RETURN jsonb_build_object(
    'success', true,
    'email', staff_user.email,
    'username', staff_user.username,
    'password', random_password,
    'full_name', staff_user.username,
    'message', 'User data prepared. Use Supabase Auth API to create the user.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix import_system_users_from_staff function
CREATE OR REPLACE FUNCTION public.import_system_users_from_staff(
  staff_user_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  staff_id UUID;
  result JSONB;
  results JSONB[] := ARRAY[]::JSONB[];
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOREACH staff_id IN ARRAY staff_user_ids LOOP
    result := public.create_system_user_from_staff(staff_id);
    results := array_append(results, result);
    
    IF (result->>'success')::boolean THEN
      success_count := success_count + 1;
    ELSE
      error_count := error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', array_length(staff_user_ids, 1),
    'success_count', success_count,
    'error_count', error_count,
    'results', to_jsonb(results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix import_rdp_users_from_dashboard function
CREATE OR REPLACE FUNCTION public.import_rdp_users_from_dashboard()
RETURNS JSONB AS $$
DECLARE
  rdp_count INTEGER;
  imported_users JSONB;
BEGIN
  -- Get all RDP users
  SELECT count(*), json_agg(row_to_json(vpn_rdp_credentials))
  INTO rdp_count, imported_users
  FROM public.vpn_rdp_credentials
  WHERE service_type = 'rdp';

  RETURN jsonb_build_object(
    'success', true,
    'count', rdp_count,
    'users', imported_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix import_vpn_users_from_dashboard function
CREATE OR REPLACE FUNCTION public.import_vpn_users_from_dashboard()
RETURNS JSONB AS $$
DECLARE
  vpn_count INTEGER;
  imported_users JSONB;
BEGIN
  -- Get all VPN users
  SELECT count(*), json_agg(row_to_json(vpn_rdp_credentials))
  INTO vpn_count, imported_users
  FROM public.vpn_rdp_credentials
  WHERE service_type = 'vpn';

  RETURN jsonb_build_object(
    'success', true,
    'count', vpn_count,
    'users', imported_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_ticket_activity function
CREATE OR REPLACE FUNCTION log_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, activity_details)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE id = NEW.created_by),
      'ticket_create',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'title', NEW.title,
        'priority', NEW.priority,
        'branch', NEW.branch,
        'device_serial_number', NEW.device_serial_number
      )
    );
  -- Log ticket updates
  ELSIF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, activity_details)
    VALUES (
      (SELECT user_id FROM public.profiles WHERE id = COALESCE(NEW.assigned_to, NEW.created_by)),
      'ticket_update',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON MIGRATION IS 'Security fix: Added SET search_path = public to all SECURITY DEFINER functions to prevent search_path manipulation attacks';
