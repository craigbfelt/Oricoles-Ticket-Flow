-- Add CEO and CFO roles to app_role enum
-- This migration is idempotent and safe to run multiple times

DO $$ 
BEGIN
  -- Add 'ceo' role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'ceo'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'ceo';
    RAISE NOTICE 'Added ceo role to app_role enum';
  ELSE
    RAISE NOTICE 'ceo role already exists in app_role enum';
  END IF;

  -- Add 'cfo' role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'cfo'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'cfo';
    RAISE NOTICE 'Added cfo role to app_role enum';
  ELSE
    RAISE NOTICE 'cfo role already exists in app_role enum';
  END IF;
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
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'app_role';
  
  RAISE NOTICE 'app_role enum now contains: %', enum_values;
  
  -- Verify all required roles exist
  IF NOT ('admin' = ANY(enum_values) AND 
          'ceo' = ANY(enum_values) AND 
          'cfo' = ANY(enum_values) AND 
          'support_staff' = ANY(enum_values) AND 
          'user' = ANY(enum_values)) THEN
    RAISE EXCEPTION 'app_role enum is missing required values';
  END IF;
  
  RAISE NOTICE 'app_role enum verification: PASSED';
END $$;
