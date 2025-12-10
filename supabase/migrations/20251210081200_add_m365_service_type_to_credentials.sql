-- Add M365 as a valid service type for vpn_rdp_credentials table
-- This allows storing Microsoft 365 credentials alongside VPN and RDP credentials

-- Drop the existing constraint
ALTER TABLE public.vpn_rdp_credentials 
  DROP CONSTRAINT IF EXISTS vpn_rdp_credentials_service_type_check;

-- Add the new constraint with M365 included
ALTER TABLE public.vpn_rdp_credentials 
  ADD CONSTRAINT vpn_rdp_credentials_service_type_check 
  CHECK (service_type IN ('VPN', 'RDP', 'M365'));

-- Add comment to document the change
COMMENT ON COLUMN public.vpn_rdp_credentials.service_type IS 'Type of credential: VPN (Virtual Private Network), RDP (Remote Desktop Protocol), or M365 (Microsoft 365)';
