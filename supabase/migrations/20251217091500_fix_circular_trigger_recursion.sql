-- Fix Circular Trigger Recursion Between Credential Sync Functions
--
-- Problem: Stack depth exceeded error when updating user details
-- Cause: Infinite loop between sync_credentials_from_master() and sync_credentials_to_master()
--   1. Update master_user_list → triggers sync_credentials_from_master()
--   2. Updates vpn_rdp_credentials → triggers sync_credentials_to_master()
--   3. Updates master_user_list → triggers sync_credentials_from_master() again
--   4. Loop continues until PostgreSQL stack depth limit (2048kB) is exceeded
--
-- Solution: Use session-level configuration parameters as recursion guards
--   - Set a flag before triggering downstream updates
--   - Check the flag at the start of each trigger function
--   - Skip execution if already in a sync operation

-- ============================================================================
-- STEP 1: Update sync_credentials_from_master() with recursion guard
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_credentials_from_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_vpn_id UUID;
  existing_rdp_id UUID;
  in_sync_operation TEXT;
BEGIN
  -- Check if we're already in a sync operation (recursion guard)
  in_sync_operation := current_setting('app.in_credential_sync', true);
  IF in_sync_operation = 'true' THEN
    -- Already syncing, skip to prevent infinite recursion
    RETURN NEW;
  END IF;

  -- Skip if email is null or empty
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Update credentials_updated_at timestamp
  NEW.credentials_updated_at := now();
  
  -- Set recursion guard flag
  PERFORM set_config('app.in_credential_sync', 'true', true);
  
  -- ========================================
  -- Sync VPN Credentials
  -- ========================================
  IF NEW.vpn_username IS NOT NULL AND TRIM(NEW.vpn_username) != '' THEN
    -- Check if VPN credential already exists for this user
    SELECT id INTO existing_vpn_id
    FROM public.vpn_rdp_credentials
    WHERE email = NEW.email
      AND service_type = 'VPN'
    LIMIT 1;
    
    IF existing_vpn_id IS NOT NULL THEN
      -- Update existing VPN credential
      UPDATE public.vpn_rdp_credentials
      SET 
        username = NEW.vpn_username,
        password = COALESCE(NEW.vpn_password, password), -- Keep existing password if new one is null
        notes = 'Synced from master user list',
        updated_at = now()
      WHERE id = existing_vpn_id;
    ELSE
      -- Insert new VPN credential
      INSERT INTO public.vpn_rdp_credentials (
        email,
        username,
        password,
        service_type,
        notes,
        created_at,
        updated_at
      ) VALUES (
        NEW.email,
        NEW.vpn_username,
        COALESCE(NEW.vpn_password, '***ENCRYPTED***'),
        'VPN',
        'Synced from master user list',
        now(),
        now()
      );
    END IF;
  END IF;
  
  -- ========================================
  -- Sync RDP Credentials
  -- ========================================
  IF NEW.rdp_username IS NOT NULL AND TRIM(NEW.rdp_username) != '' THEN
    -- Check if RDP credential already exists for this user
    SELECT id INTO existing_rdp_id
    FROM public.vpn_rdp_credentials
    WHERE email = NEW.email
      AND service_type = 'RDP'
    LIMIT 1;
    
    IF existing_rdp_id IS NOT NULL THEN
      -- Update existing RDP credential
      UPDATE public.vpn_rdp_credentials
      SET 
        username = NEW.rdp_username,
        password = COALESCE(NEW.rdp_password, password), -- Keep existing password if new one is null
        notes = 'Synced from master user list',
        updated_at = now()
      WHERE id = existing_rdp_id;
    ELSE
      -- Insert new RDP credential
      INSERT INTO public.vpn_rdp_credentials (
        email,
        username,
        password,
        service_type,
        notes,
        created_at,
        updated_at
      ) VALUES (
        NEW.email,
        NEW.rdp_username,
        COALESCE(NEW.rdp_password, '***ENCRYPTED***'),
        'RDP',
        'Synced from master user list',
        now(),
        now()
      );
    END IF;
  END IF;
  
  -- Reset recursion guard flag for clarity (also auto-clears at transaction end due to transaction-scoped setting)
  PERFORM set_config('app.in_credential_sync', 'false', true);
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: Update sync_credentials_to_master() with recursion guard
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_credentials_to_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  in_sync_operation TEXT;
BEGIN
  -- Check if we're already in a sync operation (recursion guard)
  in_sync_operation := current_setting('app.in_credential_sync', true);
  IF in_sync_operation = 'true' THEN
    -- Already syncing, skip to prevent infinite recursion
    RETURN NEW;
  END IF;

  -- Skip if email is null or empty
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Set recursion guard flag
  PERFORM set_config('app.in_credential_sync', 'true', true);
  
  -- Update master_user_list based on service type
  IF NEW.service_type = 'VPN' THEN
    UPDATE public.master_user_list
    SET 
      vpn_username = NEW.username,
      vpn_password = CASE 
        WHEN NEW.password != '***ENCRYPTED***' THEN NEW.password
        ELSE vpn_password
      END,
      credentials_updated_at = now(),
      updated_at = now()
    WHERE LOWER(email) = LOWER(NEW.email);
  ELSIF NEW.service_type = 'RDP' THEN
    UPDATE public.master_user_list
    SET 
      rdp_username = NEW.username,
      rdp_password = CASE 
        WHEN NEW.password != '***ENCRYPTED***' THEN NEW.password
        ELSE rdp_password
      END,
      credentials_updated_at = now(),
      updated_at = now()
    WHERE LOWER(email) = LOWER(NEW.email);
  END IF;
  
  -- Reset recursion guard flag for clarity (also auto-clears at transaction end due to transaction-scoped setting)
  PERFORM set_config('app.in_credential_sync', 'false', true);
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 3: Update function comments
-- ============================================================================

COMMENT ON FUNCTION sync_credentials_from_master() IS 
'Automatically syncs credential changes from master_user_list to vpn_rdp_credentials table. Includes recursion guard to prevent infinite loops with sync_credentials_to_master(). Triggered on INSERT/UPDATE.';

COMMENT ON FUNCTION sync_credentials_to_master() IS 
'Syncs manual credential edits back to master_user_list. Includes recursion guard to prevent infinite loops with sync_credentials_from_master(). Triggered on UPDATE of vpn_rdp_credentials.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- After applying this migration, test with:
-- 
-- UPDATE master_user_list 
-- SET vpn_username = 'test_vpn_user' 
-- WHERE email = 'test@example.com';
--
-- This should:
-- 1. Update master_user_list successfully
-- 2. Sync to vpn_rdp_credentials
-- 3. NOT trigger infinite recursion
-- 4. Complete without stack depth errors
-- ============================================================================
