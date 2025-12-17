-- Fix Stack Depth Exceeded Error When Updating Profiles
-- 
-- Problem: When updating the profiles table, the RLS policy evaluates has_role()
-- multiple times (in both USING and WITH CHECK clauses). When combined with the
-- handle_updated_at trigger that always modifies the row, this can cause excessive
-- stack depth usage, especially when multiple updates happen in sequence.
--
-- Solution: Optimize the handle_updated_at function to only update the timestamp
-- when other fields have actually changed, preventing unnecessary trigger re-execution
-- and reducing RLS policy evaluation overhead.

-- ============================================================================
-- STEP 1: Improve handle_updated_at function to prevent unnecessary updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  new_without_timestamp RECORD;
  old_without_timestamp RECORD;
BEGIN
  -- For INSERT operations, always set the timestamp
  IF TG_OP = 'INSERT' THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  
  -- For UPDATE operations, only update timestamp if other fields changed
  -- We need to compare all fields except updated_at itself
  -- The simplest way is to check if the NEW record (excluding updated_at) differs from OLD
  
  -- Set NEW.updated_at to OLD.updated_at temporarily for comparison
  NEW.updated_at = OLD.updated_at;
  
  -- If nothing else changed, don't update the timestamp
  IF NEW IS NOT DISTINCT FROM OLD THEN
    -- No actual changes besides timestamp, return OLD to prevent unnecessary update
    RETURN OLD;
  END IF;
  
  -- Something changed, so update the timestamp
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 2: Add comment explaining the optimization
-- ============================================================================

COMMENT ON FUNCTION public.handle_updated_at() IS 
  'Updates the updated_at timestamp only when the row data actually changes (excluding the timestamp itself). This prevents stack depth issues by avoiding unnecessary trigger executions and RLS policy evaluations when only the timestamp would change.';
