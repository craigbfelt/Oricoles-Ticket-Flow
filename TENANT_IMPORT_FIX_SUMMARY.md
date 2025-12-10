# Tenant Import Fix Summary

## Issue Description
When importing users via the "Import from Staff Users" dialog, new user accounts were created but were not assigned to any tenant. This caused subsequent operations (like CSV import) to fail with "tenant not found" errors.

## Root Cause
The `handle_new_user()` database trigger function was creating:
- ✅ Profile record in `profiles` table
- ✅ User role in `user_roles` table
- ❌ **Missing**: Tenant membership in `user_tenant_memberships` table

When the edge function `import-staff-users` created new users, they didn't get assigned to the default tenant automatically.

## Solution
Created migration `20251210130000_fix_handle_new_user_tenant_assignment.sql` that:

1. **Backfills existing users**: Assigns any existing users without tenant membership to the default tenant
2. **Updates trigger function**: Modified `handle_new_user()` to automatically assign new users to the default tenant with `is_default=true`

## What Changed

### Database Migration
The migration file performs two operations:

1. **Backfill Query**: 
   - Finds all users in `profiles` table without tenant membership
   - Assigns them to default tenant (ID: `00000000-0000-0000-0000-000000000001`)
   - Sets role as 'user' and `is_default=true`

2. **Trigger Update**:
   - Adds tenant membership creation to `handle_new_user()` function
   - Ensures all new users get assigned to default tenant automatically
   - Maintains existing role assignment logic

## Impact

### Before Fix
```
1. User imports staff user → Edge function creates auth user
2. Trigger creates profile and roles
3. ❌ No tenant membership created
4. User tries CSV import → Query for tenant_id fails
5. Error: "tenant not found"
```

### After Fix
```
1. User imports staff user → Edge function creates auth user
2. Trigger creates profile, roles, AND tenant membership
3. ✅ Tenant membership created with default tenant
4. User tries CSV import → Query for tenant_id succeeds
5. Success: Import completes
```

## Testing Recommendations

After deploying this migration:

1. ✅ **Verify Migration**: Check that the migration applies successfully
2. ✅ **Check Backfill**: Verify existing users now have tenant membership
   ```sql
   SELECT COUNT(*) FROM profiles WHERE user_id NOT IN (SELECT user_id FROM user_tenant_memberships);
   -- Should return 0
   ```
3. ✅ **Test New User Creation**: Create a new user through "Import from Staff Users"
4. ✅ **Verify Tenant Assignment**: Check the new user has tenant membership
   ```sql
   SELECT * FROM user_tenant_memberships WHERE user_id = '<new_user_id>';
   ```
5. ✅ **Test CSV Import**: Use the newly created user to import CSV data

## Related Files

- **Migration**: `supabase/migrations/20251210130000_fix_handle_new_user_tenant_assignment.sql`
- **Edge Function**: `supabase/functions/import-staff-users/index.ts`
- **CSV Importer**: `src/components/CSVUserImporter.tsx` (lines 190-203)
- **Trigger Base**: `supabase/migrations/20251119055823_backfill_missing_profiles.sql`

## Key Benefits

- ✅ New users automatically get tenant membership
- ✅ Existing users without tenant membership get backfilled
- ✅ CSV import and other tenant-scoped operations work for all users
- ✅ No breaking changes to existing functionality
- ✅ Follows existing migration patterns in the codebase

## Notes

- Default tenant ID is hardcoded as `00000000-0000-0000-0000-000000000001` (consistent with existing migrations)
- New users are assigned 'user' role in tenant membership by default
- The `is_default` flag is set to `true` for the default tenant
- Error handling is included to prevent user creation failures

## Support

If you encounter issues after applying this migration:
1. Check migration logs for any errors
2. Verify default tenant exists in `tenants` table
3. Check that `user_tenant_memberships` constraints allow the operations
4. Review edge function logs for user creation errors
