-- Fix network_diagrams.branch_id to allow NULL values for company-wide diagrams
-- 
-- BACKGROUND:
-- The earlier migration (20251112054548) created network_diagrams with branch_id NOT NULL.
-- However, the application code needs to insert company-wide diagrams with branch_id = NULL.
-- This causes the error: "null value in column 'branch_id' of relation 'network diagrams' 
-- violates not-null constraint"
--
-- SOLUTION:
-- This migration removes the NOT NULL constraint from the branch_id column, allowing
-- company-wide network diagrams to have NULL branch_id values.
--
-- AFFECTED CODE:
-- - src/pages/CompanyNetworkDiagram.tsx (lines 140, 169)
-- - src/components/ImportItemSelector.tsx (network diagram imports)
-- - src/pages/Branches.tsx (network diagram imports)
--
-- POST-MIGRATION STEPS:
-- After applying this migration, regenerate TypeScript types using:
--   supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
-- This will update the types to reflect that branch_id is now nullable.

-- Drop the NOT NULL constraint on branch_id
ALTER TABLE public.network_diagrams
  ALTER COLUMN branch_id DROP NOT NULL;

-- Add a comment to clarify the nullable behavior
COMMENT ON COLUMN public.network_diagrams.branch_id IS 'Branch ID for branch-specific diagrams. NULL for company-wide diagrams (when is_company_wide = true)';
