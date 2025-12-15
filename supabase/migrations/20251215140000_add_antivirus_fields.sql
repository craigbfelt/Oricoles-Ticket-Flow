-- Add antivirus/security fields to hardware_inventory table
-- These fields will store antivirus status information from Intune

ALTER TABLE public.hardware_inventory 
ADD COLUMN IF NOT EXISTS antivirus_name TEXT,
ADD COLUMN IF NOT EXISTS antivirus_status TEXT,
ADD COLUMN IF NOT EXISTS antivirus_last_scan TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS antivirus_definition_version TEXT,
ADD COLUMN IF NOT EXISTS antivirus_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS m365_user_email TEXT,
ADD COLUMN IF NOT EXISTS m365_user_principal_name TEXT;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_m365_email ON public.hardware_inventory(m365_user_email);
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_m365_upn ON public.hardware_inventory(m365_user_principal_name);

-- Add comments for documentation
COMMENT ON COLUMN public.hardware_inventory.antivirus_name IS 'Name of the antivirus/security software (e.g., Windows Defender, McAfee)';
COMMENT ON COLUMN public.hardware_inventory.antivirus_status IS 'Current status of the antivirus (e.g., protected, at_risk, not_installed)';
COMMENT ON COLUMN public.hardware_inventory.antivirus_last_scan IS 'Timestamp of the last antivirus scan';
COMMENT ON COLUMN public.hardware_inventory.antivirus_definition_version IS 'Version of the antivirus definitions';
COMMENT ON COLUMN public.hardware_inventory.antivirus_enabled IS 'Whether antivirus is enabled and running';
COMMENT ON COLUMN public.hardware_inventory.m365_user_email IS 'Microsoft 365 email of the assigned user';
COMMENT ON COLUMN public.hardware_inventory.m365_user_principal_name IS 'Microsoft 365 User Principal Name of the assigned user';
