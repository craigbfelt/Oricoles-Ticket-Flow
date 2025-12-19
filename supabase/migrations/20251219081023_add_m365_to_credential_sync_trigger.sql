-- Add M365 credential syncing to the sync_credentials_from_master trigger
-- This ensures M365 credentials are also synchronized when master_user_list is updated

CREATE OR REPLACE FUNCTION sync_credentials_from_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_vpn_id UUID;
  existing_rdp_id UUID;
  existing_m365_id UUID;
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
  
  -- ========================================
  -- Sync M365 Credentials (case-insensitive email check)
  -- ========================================
  IF NEW.m365_username IS NOT NULL AND TRIM(NEW.m365_username) != '' THEN
    -- Check if M365 credential already exists for this user (case-insensitive)
    SELECT id INTO existing_m365_id
    FROM public.vpn_rdp_credentials
    WHERE LOWER(email) = LOWER(NEW.email)
      AND service_type = 'M365'
    LIMIT 1;
    
    IF existing_m365_id IS NOT NULL THEN
      -- Update existing M365 credential
      UPDATE public.vpn_rdp_credentials
      SET 
        email = NEW.email, -- Update to match case from master_user_list
        username = NEW.m365_username,
        password = COALESCE(NEW.m365_password, password), -- Keep existing password if new one is null
        notes = COALESCE(notes, 'Synced from master user list'),
        updated_at = now()
      WHERE id = existing_m365_id;
    ELSE
      -- Insert new M365 credential
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
        NEW.m365_username,
        COALESCE(NEW.m365_password, '***ENCRYPTED***'),
        'M365',
        'Synced from master user list',
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update comment
COMMENT ON FUNCTION sync_credentials_from_master() 
IS 'Syncs VPN/RDP/M365 credentials from master_user_list to vpn_rdp_credentials table with case-insensitive email matching. Prevents duplicate key violations by using case-insensitive lookups.';
