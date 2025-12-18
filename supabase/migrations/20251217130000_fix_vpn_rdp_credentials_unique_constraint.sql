-- Fix VPN/RDP credentials unique constraint to handle case-insensitive emails
-- This addresses the duplicate key violation error for users like Albertus

-- ============================================================================
-- STEP 1: Drop any existing constraints that might conflict
-- ============================================================================

-- Drop the constraint added by the previous migration (if it exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vpn_rdp_credentials_email_service_type_unique'
  ) THEN
    ALTER TABLE public.vpn_rdp_credentials
    DROP CONSTRAINT vpn_rdp_credentials_email_service_type_unique;
  END IF;
END $$;

-- Drop any existing index with the name from the error message (if it exists)
DROP INDEX IF EXISTS public.idx_vpn_rdp_credentials_service_email;

-- ============================================================================
-- STEP 2: Clean up duplicate entries (case-insensitive)
-- Keep the most recently updated record for each (lower(email), service_type) combination
-- ============================================================================

DELETE FROM public.vpn_rdp_credentials
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(email), service_type 
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      ) as rn
    FROM public.vpn_rdp_credentials
    WHERE email IS NOT NULL AND service_type IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- ============================================================================
-- STEP 3: Create a case-insensitive unique index
-- This ensures emails are treated as case-insensitive (albertus@... = Albertus@...)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_vpn_rdp_credentials_service_email 
ON public.vpn_rdp_credentials (service_type, LOWER(email))
WHERE email IS NOT NULL AND service_type IS NOT NULL;

-- Add comment to document the index
COMMENT ON INDEX idx_vpn_rdp_credentials_service_email 
IS 'Ensures each user (case-insensitive email) can have only one credential record per service type (VPN, RDP, M365). Required for ON CONFLICT upsert operations.';

-- ============================================================================
-- STEP 4: Create an additional index for faster lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vpn_rdp_credentials_email_lower 
ON public.vpn_rdp_credentials (LOWER(email));
