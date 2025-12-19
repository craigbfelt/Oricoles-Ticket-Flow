-- Migration: Fix Circular Trigger Updates (Error Code 27000)
-- 
-- Problem: The circular trigger pattern between master_user_list and vpn_rdp_credentials
-- causes "tuple to be updated was already modified by an operation triggered by the current command"
-- 
-- Root Cause:
-- 1. UPDATE on master_user_list triggers sync_credentials_trigger (BEFORE)
-- 2. This trigger UPDATEs vpn_rdp_credentials
-- 3. UPDATE on vpn_rdp_credentials triggers sync_credentials_to_master_trigger (AFTER)
-- 4. This trigger tries to UPDATE master_user_list again (circular!)
-- 5. PostgreSQL detects the conflict and throws error code 27000
--
-- Solution:
-- Remove the reverse sync trigger (sync_credentials_to_master_trigger) since:
-- - UserDetailsDialog already updates master_user_list directly
-- - The forward sync (master_user_list → vpn_rdp_credentials) is sufficient
-- - This eliminates the circular update pattern

-- ============================================================================
-- STEP 1: Drop the reverse sync trigger that causes circular updates
-- ============================================================================

DROP TRIGGER IF EXISTS sync_credentials_to_master_trigger ON public.vpn_rdp_credentials;

-- ============================================================================
-- STEP 2: Drop the reverse sync function (no longer needed)
-- ============================================================================

DROP FUNCTION IF EXISTS sync_credentials_to_master();

-- ============================================================================
-- STEP 3: Verify the forward sync trigger uses AFTER timing
-- ============================================================================
-- The sync_credentials_trigger should be AFTER (not BEFORE) to avoid
-- modifying the row during the update operation itself

DROP TRIGGER IF EXISTS sync_credentials_trigger ON public.master_user_list;

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

-- Create AFTER trigger (recommended by PostgreSQL hint)
CREATE TRIGGER sync_credentials_trigger
AFTER INSERT OR UPDATE OF vpn_username, vpn_password, rdp_username, rdp_password, email
ON public.master_user_list
FOR EACH ROW
EXECUTE FUNCTION sync_credentials_from_master();

-- ============================================================================
-- STEP 4: Update credentials_updated_at using a separate BEFORE trigger
-- ============================================================================
-- Since we moved sync_credentials_trigger to AFTER, we need a separate
-- BEFORE trigger to update the credentials_updated_at timestamp

CREATE OR REPLACE FUNCTION update_credentials_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.credentials_updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_credentials_timestamp_trigger
BEFORE UPDATE OF vpn_username, vpn_password, rdp_username, rdp_password, email
ON public.master_user_list
FOR EACH ROW
EXECUTE FUNCTION update_credentials_timestamp();

-- ============================================================================
-- STEP 5: Add documentation
-- ============================================================================

COMMENT ON TRIGGER sync_credentials_trigger ON public.master_user_list IS 
'AFTER trigger that syncs credentials from master_user_list to vpn_rdp_credentials table. Uses AFTER timing to prevent circular update conflicts.';

COMMENT ON TRIGGER update_credentials_timestamp_trigger ON public.master_user_list IS 
'BEFORE trigger that updates credentials_updated_at timestamp when credentials are modified.';

COMMENT ON FUNCTION sync_credentials_from_master() IS 
'Syncs credential changes from master_user_list to vpn_rdp_credentials table. Called by AFTER trigger to avoid circular updates.';

COMMENT ON FUNCTION update_credentials_timestamp() IS 
'Updates credentials_updated_at timestamp. Separated from sync function to use BEFORE trigger timing.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- What changed:
-- 1. Removed sync_credentials_to_master_trigger (reverse sync) - eliminates circular updates
-- 2. Changed sync_credentials_trigger to AFTER timing (per PostgreSQL recommendation)
-- 3. Created separate BEFORE trigger for timestamp updates
-- 4. UserDetailsDialog flow now works: master_user_list → vpn_rdp_credentials (one-way)
--
-- Benefits:
-- - Eliminates "tuple already modified" error (code 27000)
-- - Maintains data consistency between tables
-- - Simpler, more predictable data flow
-- - master_user_list remains single source of truth
-- ============================================================================
