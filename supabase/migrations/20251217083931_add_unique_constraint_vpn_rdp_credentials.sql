-- Add unique constraint for email and service_type combination in vpn_rdp_credentials
-- This is required for ON CONFLICT upsert operations in the UserDetailsDialog component

-- First, remove any duplicate entries before adding the constraint
-- Keep the most recently updated record for each (email, service_type) combination
DELETE FROM public.vpn_rdp_credentials
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY email, service_type 
        ORDER BY updated_at DESC, created_at DESC
      ) as rn
    FROM public.vpn_rdp_credentials
    WHERE email IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Add the unique constraint
ALTER TABLE public.vpn_rdp_credentials
ADD CONSTRAINT vpn_rdp_credentials_email_service_type_unique 
UNIQUE (email, service_type);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT vpn_rdp_credentials_email_service_type_unique 
ON public.vpn_rdp_credentials 
IS 'Ensures each user (email) can have only one credential record per service type (VPN, RDP, M365). Required for ON CONFLICT upsert operations.';
