-- Fix credential sync functions to work with case-insensitive unique index
-- Updates ON CONFLICT clauses to handle the (service_type, lower(email)) unique index

-- ============================================================================
-- Update: perform_initial_credential_sync function
-- ============================================================================

CREATE OR REPLACE FUNCTION perform_initial_credential_sync()
RETURNS TABLE (
  synced_users INTEGER,
  synced_vpn INTEGER,
  synced_rdp INTEGER,
  errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER := 0;
  vpn_count INTEGER := 0;
  rdp_count INTEGER := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
  user_record RECORD;
  existing_cred_id UUID;
BEGIN
  -- Sync all users from master_user_list to vpn_rdp_credentials
  FOR user_record IN 
    SELECT * FROM public.master_user_list 
    WHERE is_active = true AND email IS NOT NULL
  LOOP
    BEGIN
      user_count := user_count + 1;
      
      -- Sync VPN
      IF user_record.vpn_username IS NOT NULL AND TRIM(user_record.vpn_username) != '' THEN
        -- Check if VPN credential exists (case-insensitive)
        SELECT id INTO existing_cred_id
        FROM public.vpn_rdp_credentials
        WHERE LOWER(email) = LOWER(user_record.email)
          AND service_type = 'VPN'
        LIMIT 1;
        
        IF existing_cred_id IS NULL THEN
          -- Insert only if not exists
          INSERT INTO public.vpn_rdp_credentials (
            email, username, password, service_type, notes, created_at, updated_at
          ) VALUES (
            user_record.email,
            user_record.vpn_username,
            COALESCE(user_record.vpn_password, '***ENCRYPTED***'),
            'VPN',
            'Initial sync from master user list',
            now(),
            now()
          );
        END IF;
        
        vpn_count := vpn_count + 1;
      END IF;
      
      -- Sync RDP
      IF user_record.rdp_username IS NOT NULL AND TRIM(user_record.rdp_username) != '' THEN
        -- Check if RDP credential exists (case-insensitive)
        SELECT id INTO existing_cred_id
        FROM public.vpn_rdp_credentials
        WHERE LOWER(email) = LOWER(user_record.email)
          AND service_type = 'RDP'
        LIMIT 1;
        
        IF existing_cred_id IS NULL THEN
          -- Insert only if not exists
          INSERT INTO public.vpn_rdp_credentials (
            email, username, password, service_type, notes, created_at, updated_at
          ) VALUES (
            user_record.email,
            user_record.rdp_username,
            COALESCE(user_record.rdp_password, '***ENCRYPTED***'),
            'RDP',
            'Initial sync from master user list',
            now(),
            now()
          );
        END IF;
        
        rdp_count := rdp_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_list := array_append(error_list, 'Error syncing user ' || user_record.email || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT user_count, vpn_count, rdp_count, error_list;
END;
$$;

-- ============================================================================
-- Update: sync_credentials_from_master function
-- This function is triggered when master_user_list is updated
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
BEGIN
  -- Skip if email is null or empty
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Update credentials_updated_at timestamp
  NEW.credentials_updated_at := now();
  
  -- ========================================
  -- Sync VPN Credentials (case-insensitive email check)
  -- ========================================
  IF NEW.vpn_username IS NOT NULL AND TRIM(NEW.vpn_username) != '' THEN
    -- Check if VPN credential already exists for this user (case-insensitive)
    SELECT id INTO existing_vpn_id
    FROM public.vpn_rdp_credentials
    WHERE LOWER(email) = LOWER(NEW.email)
      AND service_type = 'VPN'
    LIMIT 1;
    
    IF existing_vpn_id IS NOT NULL THEN
      -- Update existing VPN credential
      UPDATE public.vpn_rdp_credentials
      SET 
        email = NEW.email, -- Update to match case from master_user_list
        username = NEW.vpn_username,
        password = COALESCE(NEW.vpn_password, password), -- Keep existing password if new one is null
        notes = COALESCE(notes, 'Synced from master user list'),
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
  -- Sync RDP Credentials (case-insensitive email check)
  -- ========================================
  IF NEW.rdp_username IS NOT NULL AND TRIM(NEW.rdp_username) != '' THEN
    -- Check if RDP credential already exists for this user (case-insensitive)
    SELECT id INTO existing_rdp_id
    FROM public.vpn_rdp_credentials
    WHERE LOWER(email) = LOWER(NEW.email)
      AND service_type = 'RDP'
    LIMIT 1;
    
    IF existing_rdp_id IS NOT NULL THEN
      -- Update existing RDP credential
      UPDATE public.vpn_rdp_credentials
      SET 
        email = NEW.email, -- Update to match case from master_user_list
        username = NEW.rdp_username,
        password = COALESCE(NEW.rdp_password, password), -- Keep existing password if new one is null
        notes = COALESCE(notes, 'Synced from master user list'),
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
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION sync_credentials_from_master() 
IS 'Syncs VPN/RDP credentials from master_user_list to vpn_rdp_credentials table with case-insensitive email matching';

COMMENT ON FUNCTION perform_initial_credential_sync() 
IS 'Performs initial sync of credentials from master_user_list with case-insensitive email matching';
