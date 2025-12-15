-- =====================================================
-- Fix sync_intune_devices_to_master_users function
-- to handle optional tenant_id correctly
-- =====================================================
-- 
-- This migration updates the sync function to fix the
-- "column tenant_id does not exist" error by:
-- 1. Looking up tenant_id from user_tenant_memberships (not profiles)
-- 2. Initializing tenant_id as NULL (making it optional)
-- 3. Continuing sync even if tenant_id is not found
--
-- This is a re-application of fixes from migration 20251209111600
-- in case the database was created with an older version of that function.

CREATE OR REPLACE FUNCTION public.sync_intune_devices_to_master_users()
RETURNS TABLE (
  synced_count INTEGER,
  new_assignments INTEGER,
  changes_detected INTEGER,
  errors_count INTEGER
) AS $$
DECLARE
  v_synced_count INTEGER := 0;
  v_new_assignments INTEGER := 0;
  v_changes_detected INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_device RECORD;
  v_current_assignment RECORD;
  v_master_user RECORD;
  v_tenant_id UUID := NULL;
BEGIN
  -- Try to get tenant_id from user_tenant_memberships if it exists
  -- Tenant_id is now optional, so we don't fail if it's not found
  SELECT tenant_id INTO v_tenant_id
  FROM public.user_tenant_memberships
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Continue with sync even if tenant_id is NULL (tenant system is optional)

  -- Loop through all devices in hardware_inventory that have M365 user assignments
  FOR v_device IN 
    SELECT 
      serial_number,
      device_name,
      model,
      m365_user_principal_name,
      m365_user_email
    FROM public.hardware_inventory
    WHERE m365_user_principal_name IS NOT NULL OR m365_user_email IS NOT NULL
  LOOP
    BEGIN
      -- Try to find the user in master_user_list by email
      SELECT * INTO v_master_user
      FROM public.master_user_list
      WHERE LOWER(email) = LOWER(COALESCE(v_device.m365_user_email, v_device.m365_user_principal_name))
      AND is_active = true
      LIMIT 1;

      IF NOT FOUND THEN
        -- User not in master list, skip
        CONTINUE;
      END IF;

      -- Check if there's a current assignment for this device
      SELECT * INTO v_current_assignment
      FROM public.device_user_assignments
      WHERE device_serial_number = v_device.serial_number
      AND is_current = true
      LIMIT 1;

      IF FOUND THEN
        -- Device already has an assignment, check if user changed
        IF LOWER(v_current_assignment.user_email) != LOWER(v_master_user.email) THEN
          -- User changed - log the change
          INSERT INTO public.device_change_history (
            device_serial_number,
            change_type,
            old_user_email,
            new_user_email,
            tenant_id
          ) VALUES (
            v_device.serial_number,
            'reassignment',
            v_current_assignment.user_email,
            v_master_user.email,
            v_tenant_id
          );

          -- Mark old assignment as not current
          UPDATE public.device_user_assignments
          SET is_current = false
          WHERE id = v_current_assignment.id;

          -- Create new assignment
          INSERT INTO public.device_user_assignments (
            device_serial_number,
            user_email,
            device_name,
            device_model,
            assignment_source,
            is_current,
            tenant_id
          ) VALUES (
            v_device.serial_number,
            v_master_user.email,
            v_device.device_name,
            v_device.model,
            'intune_sync',
            true,
            v_tenant_id
          );

          v_changes_detected := v_changes_detected + 1;
        ELSE
          -- Same user, just update device details if changed (NULL-safe comparison)
          UPDATE public.device_user_assignments
          SET 
            device_name = v_device.device_name,
            device_model = v_device.model,
            updated_at = now()
          WHERE id = v_current_assignment.id
          AND (
            device_name IS DISTINCT FROM v_device.device_name OR
            device_model IS DISTINCT FROM v_device.model
          );
        END IF;
      ELSE
        -- No current assignment exists, create new one
        INSERT INTO public.device_user_assignments (
          device_serial_number,
          user_email,
          device_name,
          device_model,
          assignment_source,
          is_current,
          tenant_id
        ) VALUES (
          v_device.serial_number,
          v_master_user.email,
          v_device.device_name,
          v_device.model,
          'intune_sync',
          true,
          v_tenant_id
        );

        -- Log as new device
        INSERT INTO public.device_change_history (
          device_serial_number,
          change_type,
          new_user_email,
          tenant_id
        ) VALUES (
          v_device.serial_number,
          'new_device',
          v_master_user.email,
          v_tenant_id
        );

        v_new_assignments := v_new_assignments + 1;
      END IF;

      v_synced_count := v_synced_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error syncing device % (user: %): % - SQLSTATE: %', 
        v_device.serial_number, 
        COALESCE(v_device.m365_user_email, v_device.m365_user_principal_name, 'unknown'),
        SQLERRM,
        SQLSTATE;
    END;
  END LOOP;

  RETURN QUERY SELECT v_synced_count, v_new_assignments, v_changes_detected, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_intune_devices_to_master_users IS 
'Syncs Intune device data with master user list, detecting device reassignments and changes. Should be run periodically or after Intune sync. Tenant_id is optional.';
