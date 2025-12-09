-- =====================================================================
-- CRITICAL FIX: Add CEO and CFO Roles to app_role Enum
-- =====================================================================
-- This SQL script fixes the Settings page blank issue and enables 
-- CEO/CFO role functionality.
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard → SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Look for success messages in the results
--
-- This script is IDEMPOTENT (safe to run multiple times)
-- =====================================================================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting app_role enum fix...';
  RAISE NOTICE '========================================';
  
  -- Add 'ceo' role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'ceo'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'ceo';
    RAISE NOTICE '✓ Added ceo role to app_role enum';
  ELSE
    RAISE NOTICE '✓ ceo role already exists in app_role enum';
  END IF;

  -- Add 'cfo' role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'cfo'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'cfo';
    RAISE NOTICE '✓ Added cfo role to app_role enum';
  ELSE
    RAISE NOTICE '✓ cfo role already exists in app_role enum';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Update the comment to reflect all roles
COMMENT ON TYPE app_role IS 'Application roles with hierarchy:
- admin: Full system access including user management
- ceo: View access to most features, limited edit access, cannot manage system users
- cfo: Similar to CEO, view access with limited edit capabilities
- support_staff: Can manage tickets, view users, limited administrative access
- user: Basic access to own tickets and profile';

-- Verify the enum now has all required values
DO $$
DECLARE
  enum_values TEXT[];
  role_count INTEGER;
BEGIN
  RAISE NOTICE 'Verifying app_role enum...';
  
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'app_role';
  
  role_count := array_length(enum_values, 1);
  
  RAISE NOTICE 'app_role enum now contains % roles:', role_count;
  RAISE NOTICE '  %', enum_values;
  
  -- Verify all required roles exist
  IF NOT ('admin' = ANY(enum_values) AND 
          'ceo' = ANY(enum_values) AND 
          'cfo' = ANY(enum_values) AND 
          'support_staff' = ANY(enum_values) AND 
          'user' = ANY(enum_values)) THEN
    RAISE EXCEPTION '✗ FAILED: app_role enum is missing required values';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ SUCCESS: app_role enum verification PASSED';
  RAISE NOTICE '✓ Settings page should now work correctly';
  RAISE NOTICE '✓ CEO and CFO roles are now functional';
  RAISE NOTICE '========================================';
END $$;

-- Show the final enum values for confirmation
SELECT 
  e.enumlabel as role_name,
  e.enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;
