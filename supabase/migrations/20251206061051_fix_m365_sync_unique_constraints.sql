-- Migration: Fix M365 sync unique constraints
-- This migration adds missing unique constraints required for ON CONFLICT upsert operations
-- in the sync-microsoft-365 Edge Function

-- ============================================================================
-- 1. Fix hardware_inventory.m365_device_id unique constraint
-- ============================================================================
-- The previous migration used ADD COLUMN IF NOT EXISTS with UNIQUE, but if the
-- column already existed, the UNIQUE constraint wasn't added.

-- First, remove any duplicate m365_device_id values (keep the most recently updated)
-- This is necessary before adding a unique constraint
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY m365_device_id 
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) as rn
  FROM public.hardware_inventory
  WHERE m365_device_id IS NOT NULL
)
DELETE FROM public.hardware_inventory
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add the unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hardware_inventory_m365_device_id_key'
  ) THEN
    ALTER TABLE public.hardware_inventory
    ADD CONSTRAINT hardware_inventory_m365_device_id_key UNIQUE (m365_device_id);
  END IF;
END $$;

-- ============================================================================
-- 2. Ensure directory_users.aad_id unique constraint exists
-- ============================================================================
-- Previous migration should have added this, but verify it exists

-- First, remove any duplicate aad_id values (keep the most recently updated)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY aad_id 
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) as rn
  FROM public.directory_users
  WHERE aad_id IS NOT NULL
)
DELETE FROM public.directory_users
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add the unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'directory_users_aad_id_key'
  ) THEN
    ALTER TABLE public.directory_users
    ADD CONSTRAINT directory_users_aad_id_key UNIQUE (aad_id);
  END IF;
END $$;

-- ============================================================================
-- 3. Add M365 SKU columns and unique constraint to licenses table
-- ============================================================================
-- Add columns for M365 license sync if they don't exist
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS m365_sku_id TEXT,
ADD COLUMN IF NOT EXISTS m365_sku_part_number TEXT,
ADD COLUMN IF NOT EXISTS synced_from_m365 BOOLEAN DEFAULT FALSE;

-- First, remove any duplicate m365_sku_id values (keep the most recently updated)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY m365_sku_id 
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) as rn
  FROM public.licenses
  WHERE m365_sku_id IS NOT NULL
)
DELETE FROM public.licenses
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add the unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'licenses_m365_sku_id_key'
  ) THEN
    ALTER TABLE public.licenses
    ADD CONSTRAINT licenses_m365_sku_id_key UNIQUE (m365_sku_id);
  END IF;
END $$;

-- Create index for faster M365 license lookups
CREATE INDEX IF NOT EXISTS idx_licenses_m365_sku_id 
ON public.licenses(m365_sku_id) 
WHERE m365_sku_id IS NOT NULL;

-- ============================================================================
-- 4. Add comments explaining the constraints
-- ============================================================================
COMMENT ON CONSTRAINT hardware_inventory_m365_device_id_key ON public.hardware_inventory 
IS 'Ensures unique m365_device_id values for ON CONFLICT upsert in M365 sync';

COMMENT ON CONSTRAINT directory_users_aad_id_key ON public.directory_users 
IS 'Ensures unique aad_id values for ON CONFLICT upsert in M365 sync';

COMMENT ON CONSTRAINT licenses_m365_sku_id_key ON public.licenses 
IS 'Ensures unique m365_sku_id values for ON CONFLICT upsert in M365 license sync';

COMMENT ON COLUMN public.licenses.m365_sku_id IS 'Microsoft 365 SKU ID from Graph API';
COMMENT ON COLUMN public.licenses.m365_sku_part_number IS 'Microsoft 365 SKU part number (e.g., ENTERPRISEPACK, SPB)';
COMMENT ON COLUMN public.licenses.synced_from_m365 IS 'Whether this license was synced from Microsoft 365';
