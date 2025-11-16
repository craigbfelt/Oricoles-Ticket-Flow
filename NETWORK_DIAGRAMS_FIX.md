# Network Diagrams Branch ID Fix

## Problem
When creating company-wide network diagrams, the application was encountering the following error:
```
null value in column "branch_id" of relation "network diagrams" violates not-null constraint
```

## Root Cause
The `network_diagrams` table was created with a `NOT NULL` constraint on the `branch_id` column (in migration `20251112054548_cbcbc569-cc63-4810-8938-1a8d760222b0.sql`). However, the application code needs to insert company-wide network diagrams with `branch_id = NULL` to distinguish them from branch-specific diagrams.

### Affected Code Locations
1. `src/pages/CompanyNetworkDiagram.tsx` (lines 140, 169) - Inserts company-wide diagrams with `branch_id: null`
2. `src/components/ImportItemSelector.tsx` - Imports network diagrams with optional branch_id
3. `src/pages/Branches.tsx` - Imports network diagrams with optional branch_id

## Solution
A new migration has been created: `supabase/migrations/20251116081115_fix_network_diagrams_branch_id_nullable.sql`

This migration:
1. Removes the `NOT NULL` constraint from the `branch_id` column
2. Adds a comment clarifying that `branch_id` can be NULL for company-wide diagrams

## How to Apply the Fix

### Option 1: Apply migration via Supabase Dashboard
1. Log into your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the contents of `supabase/migrations/20251116081115_fix_network_diagrams_branch_id_nullable.sql`
4. Paste and run the SQL

### Option 2: Apply migration via Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

### Option 3: Manual SQL execution
Execute this SQL directly in your database:
```sql
ALTER TABLE public.network_diagrams
  ALTER COLUMN branch_id DROP NOT NULL;

COMMENT ON COLUMN public.network_diagrams.branch_id IS 'Branch ID for branch-specific diagrams. NULL for company-wide diagrams (when is_company_wide = true)';
```

## Post-Migration Steps

After applying the migration, regenerate TypeScript types to reflect the schema changes:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

Replace `<your-project-id>` with your actual Supabase project ID.

## Verification

After applying the migration:
1. The error should no longer occur when creating company-wide network diagrams
2. Company-wide diagrams will have `branch_id = NULL`
3. Branch-specific diagrams will continue to have a valid `branch_id` value

## Impact
This change is backward compatible:
- Existing branch-specific diagrams will continue to work as before
- The application can now create company-wide diagrams without constraint violations
- No data migration is required - existing rows are unaffected
