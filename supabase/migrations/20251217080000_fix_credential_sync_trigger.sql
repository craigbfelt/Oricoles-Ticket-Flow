-- Migration: Fix Credential Sync Trigger
-- This migration fixes the sync_credentials_from_master trigger by changing it from AFTER to BEFORE
-- so it can properly update the NEW.credentials_updated_at field

-- ============================================================================
-- STEP 1: Drop the existing AFTER trigger
-- ============================================================================

DROP TRIGGER IF EXISTS sync_credentials_trigger ON public.master_user_list;

-- ============================================================================
-- STEP 2: Recreate the sync function with proper BEFORE trigger logic
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

-- ============================================================================
-- STEP 3: Create BEFORE trigger instead of AFTER trigger
-- ============================================================================

CREATE TRIGGER sync_credentials_trigger
BEFORE INSERT OR UPDATE OF vpn_username, vpn_password, rdp_username, rdp_password, email
ON public.master_user_list
FOR EACH ROW
EXECUTE FUNCTION sync_credentials_from_master();

-- ============================================================================
-- STEP 4: Add comment for documentation
-- ============================================================================

COMMENT ON TRIGGER sync_credentials_trigger ON public.master_user_list IS 
'BEFORE trigger that updates credentials_updated_at and syncs credentials to vpn_rdp_credentials table';
