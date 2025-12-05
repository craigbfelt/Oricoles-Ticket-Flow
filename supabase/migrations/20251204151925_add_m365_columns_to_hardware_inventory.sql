-- Migration: Add Microsoft 365 sync columns to hardware_inventory
-- This migration adds columns to support syncing device data from Microsoft Intune/Endpoint Manager

-- Add M365-specific columns to hardware_inventory table
ALTER TABLE public.hardware_inventory 
ADD COLUMN IF NOT EXISTS m365_device_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS m365_user_principal_name TEXT,
ADD COLUMN IF NOT EXISTS m365_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS m365_enrolled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS synced_from_m365 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_manually BOOLEAN DEFAULT FALSE;

-- Create index for faster M365 device lookups
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_m365_device_id 
ON public.hardware_inventory(m365_device_id) 
WHERE m365_device_id IS NOT NULL;

-- Create index for M365 synced devices
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_synced_from_m365 
ON public.hardware_inventory(synced_from_m365) 
WHERE synced_from_m365 = TRUE;

-- Add comment explaining the M365 integration
COMMENT ON COLUMN public.hardware_inventory.m365_device_id IS 'Unique device ID from Microsoft Intune/Endpoint Manager';
COMMENT ON COLUMN public.hardware_inventory.m365_user_principal_name IS 'User principal name (email) of the device owner from Azure AD';
COMMENT ON COLUMN public.hardware_inventory.m365_last_sync IS 'Last time this device synced with Intune';
COMMENT ON COLUMN public.hardware_inventory.m365_enrolled_date IS 'Date the device was enrolled in Intune';
COMMENT ON COLUMN public.hardware_inventory.synced_from_m365 IS 'Whether this device was synced from Microsoft 365/Intune';
COMMENT ON COLUMN public.hardware_inventory.deleted_manually IS 'Whether this device was manually deleted by admin';
