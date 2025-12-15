-- =============================================
-- Add tenant_id column to user_permissions table
-- =============================================
-- 
-- This migration adds the tenant_id column to the user_permissions table
-- to fix the "column tenant_id does not exist" error.
-- 
-- The user_permissions table was recreated in migration 20251209094500
-- without the tenant_id column that was previously added in migration 20251128065444.
-- This migration ensures the column exists and is properly indexed.

-- Add tenant_id column if it doesn't exist
-- Use ON DELETE SET NULL to gracefully handle tenant deletion
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Create index for tenant_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant ON public.user_permissions(tenant_id);

-- Add helpful comment
COMMENT ON COLUMN public.user_permissions.tenant_id IS 'Reference to the tenant that owns this permission record';
