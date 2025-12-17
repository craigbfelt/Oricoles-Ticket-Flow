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
BEGIN
  -- For INSERT operations, always set the timestamp
  IF TG_OP = 'INSERT' THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  
  -- For UPDATE operations, only update timestamp if other fields changed
  -- Temporarily set NEW.updated_at to OLD.updated_at for comparison
  NEW.updated_at = OLD.updated_at;
  
  -- Check if anything else besides updated_at changed
  IF NEW IS NOT DISTINCT FROM OLD THEN
    -- Nothing changed except updated_at, no need to update anything
    -- Keep the old timestamp (it's already set above)
    RETURN NEW;
  ELSE
    -- Something changed, so update the timestamp to now
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 2: Add comment explaining the optimization
-- ============================================================================

COMMENT ON FUNCTION public.handle_updated_at() IS 
  'Updates the updated_at timestamp only when the row data actually changes (excluding the timestamp itself). This prevents stack depth issues by avoiding unnecessary trigger executions and RLS policy evaluations when only the timestamp would change.';
