-- Migration: Create Credential Synchronization System
-- This migration establishes master_user_list as the single source of truth
-- for user credentials (VPN, RDP, M365) and syncs changes across all tables

-- ============================================================================
-- STEP 1: Ensure master_user_list has all credential fields
-- ============================================================================

-- Add M365 credential fields if they don't exist
ALTER TABLE public.master_user_list
ADD COLUMN IF NOT EXISTS m365_username TEXT,
ADD COLUMN IF NOT EXISTS m365_password TEXT;

-- Add timestamps for tracking changes
ALTER TABLE public.master_user_list
ADD COLUMN IF NOT EXISTS credentials_updated_at TIMESTAMPTZ DEFAULT now();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_user_list_email_lower ON public.master_user_list (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_master_user_list_vpn_username ON public.master_user_list (vpn_username);
CREATE INDEX IF NOT EXISTS idx_master_user_list_rdp_username ON public.master_user_list (rdp_username);

-- ============================================================================
-- STEP 2: Create function to sync credentials from master_user_list to vpn_rdp_credentials
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
-- STEP 3: Create trigger to auto-sync on master_user_list changes
-- ============================================================================

DROP TRIGGER IF EXISTS sync_credentials_trigger ON public.master_user_list;

CREATE TRIGGER sync_credentials_trigger
AFTER INSERT OR UPDATE OF vpn_username, vpn_password, rdp_username, rdp_password, m365_username, m365_password, email
ON public.master_user_list
FOR EACH ROW
EXECUTE FUNCTION sync_credentials_from_master();

-- ============================================================================
-- STEP 4: Create function to sync changes back from vpn_rdp_credentials to master_user_list
-- (For manual edits in the credentials table)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_credentials_to_master()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if email is null or empty
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;
  
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
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 5: Create trigger for reverse sync (credentials table -> master_user_list)
-- ============================================================================

DROP TRIGGER IF EXISTS sync_credentials_to_master_trigger ON public.vpn_rdp_credentials;

CREATE TRIGGER sync_credentials_to_master_trigger
AFTER UPDATE OF username, password
ON public.vpn_rdp_credentials
FOR EACH ROW
EXECUTE FUNCTION sync_credentials_to_master();

-- ============================================================================
-- STEP 6: Create function to perform initial sync of existing data
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
        )
        ON CONFLICT (email, service_type) DO NOTHING;
        
        vpn_count := vpn_count + 1;
      END IF;
      
      -- Sync RDP
      IF user_record.rdp_username IS NOT NULL AND TRIM(user_record.rdp_username) != '' THEN
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
        )
        ON CONFLICT (email, service_type) DO NOTHING;
        
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
-- STEP 7: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION sync_credentials_from_master() IS 'Automatically syncs credential changes from master_user_list to vpn_rdp_credentials table. Triggered on INSERT/UPDATE.';
COMMENT ON FUNCTION sync_credentials_to_master() IS 'Syncs manual credential edits back to master_user_list. Triggered on UPDATE of vpn_rdp_credentials.';
COMMENT ON FUNCTION perform_initial_credential_sync() IS 'One-time function to sync all existing credentials from master_user_list to vpn_rdp_credentials.';

COMMENT ON COLUMN master_user_list.credentials_updated_at IS 'Timestamp of last credential update. Used for tracking changes.';
COMMENT ON COLUMN master_user_list.m365_username IS 'Microsoft 365 username/email';
COMMENT ON COLUMN master_user_list.m365_password IS 'Microsoft 365 password';

-- ============================================================================
-- STEP 8: Grant necessary permissions
-- ============================================================================

-- Ensure authenticated users can use the sync function
GRANT EXECUTE ON FUNCTION perform_initial_credential_sync() TO authenticated;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 
-- To perform initial sync of existing data:
-- SELECT * FROM perform_initial_credential_sync();
--
-- After this migration:
-- 1. Any changes to master_user_list credentials will auto-sync to vpn_rdp_credentials
-- 2. Any manual edits to vpn_rdp_credentials will sync back to master_user_list
-- 3. master_user_list is now the single source of truth
-- 4. All pages should read from master_user_list for latest credential data
-- ============================================================================
