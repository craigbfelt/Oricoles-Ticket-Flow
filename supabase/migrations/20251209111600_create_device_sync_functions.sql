-- Create functions for automatic device sync and change detection
-- This enables automatic detection of device changes from Intune and updates to master user list

-- =====================================================
-- 1. FUNCTION: Sync Intune devices with master user list
-- =====================================================
-- This function compares Intune hardware_inventory with master_user_list
-- and creates/updates device_user_assignments, detecting changes

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
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the calling user's profile
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- If no profile found, raise an error
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant_id found for current user. Cannot proceed with sync.';
  END IF;

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

-- Grant execute permission to authenticated users with admin role
COMMENT ON FUNCTION public.sync_intune_devices_to_master_users IS 
'Syncs Intune device data with master user list, detecting device reassignments and changes. Should be run periodically or after Intune sync.';

-- =====================================================
-- 2. FUNCTION: Get user summary with all associated data
-- =====================================================
-- Returns comprehensive user data including devices, credentials, and change history

CREATE OR REPLACE FUNCTION public.get_user_summary(p_user_email TEXT)
RETURNS TABLE (
  user_data JSONB,
  devices JSONB,
  vpn_credentials JSONB,
  rdp_credentials JSONB,
  device_changes JSONB,
  intune_user JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT jsonb_build_object(
      'email', email,
      'display_name', display_name,
      'job_title', job_title,
      'department', department,
      'vpn_username', vpn_username,
      'rdp_username', rdp_username,
      'is_active', is_active,
      'source', source
    ) as data
    FROM public.master_user_list
    WHERE LOWER(email) = LOWER(p_user_email)
  ),
  device_info AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'serial_number', device_serial_number,
        'device_name', device_name,
        'device_model', device_model,
        'is_current', is_current,
        'assignment_date', assignment_date
      ) ORDER BY assignment_date DESC
    ) as data
    FROM public.device_user_assignments
    WHERE LOWER(user_email) = LOWER(p_user_email)
  ),
  vpn_info AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'username', username,
        'created_at', created_at
      )
    ) as data
    FROM public.vpn_rdp_credentials
    WHERE LOWER(email) = LOWER(p_user_email)
    AND service_type = 'VPN'
  ),
  rdp_info AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'username', username,
        'created_at', created_at
      )
    ) as data
    FROM public.vpn_rdp_credentials
    WHERE LOWER(email) = LOWER(p_user_email)
    AND service_type = 'RDP'
  ),
  change_info AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'device_serial_number', device_serial_number,
        'change_type', change_type,
        'old_user_email', old_user_email,
        'new_user_email', new_user_email,
        'detected_at', detected_at,
        'reviewed', reviewed
      ) ORDER BY detected_at DESC
    ) as data
    FROM public.device_change_history
    WHERE LOWER(old_user_email) = LOWER(p_user_email)
    OR LOWER(new_user_email) = LOWER(p_user_email)
  ),
  intune_info AS (
    SELECT jsonb_build_object(
      'display_name', display_name,
      'user_principal_name', user_principal_name,
      'job_title', job_title,
      'department', department,
      'account_enabled', account_enabled
    ) as data
    FROM public.directory_users
    WHERE LOWER(email) = LOWER(p_user_email)
  )
  SELECT 
    COALESCE(u.data, '{}'::jsonb),
    COALESCE(d.data, '[]'::jsonb),
    COALESCE(v.data, '[]'::jsonb),
    COALESCE(r.data, '[]'::jsonb),
    COALESCE(c.data, '[]'::jsonb),
    COALESCE(i.data, '{}'::jsonb)
  FROM user_info u
  CROSS JOIN device_info d
  CROSS JOIN vpn_info v
  CROSS JOIN rdp_info r
  CROSS JOIN change_info c
  CROSS JOIN intune_info i;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_summary IS 
'Returns comprehensive summary of a user including master list data, devices, credentials, change history, and Intune data.';

-- =====================================================
-- 3. FUNCTION: Detect unassigned Intune devices
-- =====================================================
-- Finds devices in Intune that aren't assigned to anyone in master_user_list

CREATE OR REPLACE FUNCTION public.find_unassigned_intune_devices()
RETURNS TABLE (
  serial_number TEXT,
  device_name TEXT,
  model TEXT,
  m365_user_principal_name TEXT,
  m365_user_email TEXT,
  in_master_list BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.serial_number,
    h.device_name,
    h.model,
    h.m365_user_principal_name,
    h.m365_user_email,
    EXISTS (
      SELECT 1 FROM public.master_user_list m
      WHERE LOWER(m.email) = LOWER(COALESCE(h.m365_user_email, h.m365_user_principal_name))
      AND m.is_active = true
    ) as in_master_list
  FROM public.hardware_inventory h
  WHERE h.m365_user_principal_name IS NOT NULL OR h.m365_user_email IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.find_unassigned_intune_devices IS 
'Finds all devices in Intune and checks if their assigned users exist in master_user_list.';
