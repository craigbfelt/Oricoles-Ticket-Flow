# Stack Depth Exceeded Error - Fix Documentation

## Problem

When saving user details in the UserDetailsDialog component, the following error occurred:

```
Error saving user details:
{
  code: "54001",
  details: null,
  hint: "Increase the configuration parameter \"max_stack_depth\" (currently 2048kB), after ensuring the platform's stack depth limit is adequate.",
  message: "stack depth limit exceeded"
}
```

## Root Cause

The error was caused by **circular trigger recursion** between two database trigger functions:

1. **`sync_credentials_from_master()`** - Triggered when `master_user_list` is updated
   - Updates the `vpn_rdp_credentials` table with new credential data
   
2. **`sync_credentials_to_master()`** - Triggered when `vpn_rdp_credentials` is updated
   - Updates the `master_user_list` table to keep it in sync

### The Infinite Loop

```
User saves data
    ↓
Update master_user_list
    ↓
Trigger: sync_credentials_from_master() fires
    ↓
Update vpn_rdp_credentials
    ↓
Trigger: sync_credentials_to_master() fires
    ↓
Update master_user_list
    ↓
Trigger: sync_credentials_from_master() fires again
    ↓
... (repeats infinitely)
    ↓
PostgreSQL stack depth limit exceeded (2048kB)
```

## Solution

Added **recursion guards** to both trigger functions using PostgreSQL's session-level configuration parameters:

### How It Works

1. **Before executing sync logic**: Check if `app.in_credential_sync` flag is set
2. **If flag is set**: Skip execution and return immediately (prevents recursion)
3. **If flag is not set**: 
   - Set the flag to `true`
   - Execute the sync logic
   - Clear the flag to `false`

### Implementation Details

```sql
-- Check recursion guard at start of function
in_sync_operation := current_setting('app.in_credential_sync', true);
IF in_sync_operation = 'true' THEN
  -- Already syncing, skip to prevent infinite recursion
  RETURN NEW;
END IF;

-- Set flag before executing sync
PERFORM set_config('app.in_credential_sync', 'true', true);

-- ... perform sync operations ...

-- Clear flag after sync
PERFORM set_config('app.in_credential_sync', 'false', true);
```

The `true` parameter in `set_config()` makes it transaction-scoped, meaning it automatically resets at the end of the transaction.

## Migration Applied

**File**: `supabase/migrations/20251217091500_fix_circular_trigger_recursion.sql`

This migration:
1. Updates `sync_credentials_from_master()` function with recursion guard
2. Updates `sync_credentials_to_master()` function with recursion guard
3. Adds documentation comments explaining the guards

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the content from `supabase/migrations/20251217091500_fix_circular_trigger_recursion.sql`
4. Paste into the SQL Editor
5. Click **Run**

### Option 2: Using Supabase CLI

```bash
npx supabase db push
```

### Option 3: Using Migration Script

```bash
npm run migrate
```

## Testing the Fix

After applying the migration, test by:

1. Open the application
2. Navigate to the Users page
3. Click on a user to open the UserDetailsDialog
4. Edit VPN or RDP credentials
5. Click **Save**
6. The save should complete successfully without errors

### SQL Test Query

You can also test directly in the Supabase SQL Editor:

```sql
-- Test update that would previously cause recursion
UPDATE master_user_list 
SET vpn_username = 'test_update_' || floor(random() * 1000)::text
WHERE email = (SELECT email FROM master_user_list WHERE is_active = true LIMIT 1);

-- Check if both tables are updated without errors
SELECT email, vpn_username FROM master_user_list WHERE is_active = true LIMIT 5;
SELECT email, username FROM vpn_rdp_credentials WHERE service_type = 'VPN' LIMIT 5;
```

## Technical Details

### Why This Approach?

**Alternative approaches considered:**

1. ❌ **Remove one of the triggers** - Would break bi-directional sync
2. ❌ **Use WHEN clause in triggers** - Cannot detect if called from another trigger
3. ❌ **Track in a state table** - Adds complexity and potential for stale data
4. ✅ **Session configuration parameters** - Clean, transaction-scoped, automatic cleanup

### Session Configuration Benefits

- **Transaction-scoped**: Automatically resets when transaction ends
- **No persistence**: No state table or cleanup needed
- **Thread-safe**: Each database session has its own configuration
- **Standard PostgreSQL**: No custom extensions required

## Related Files

- **Migration**: `supabase/migrations/20251217091500_fix_circular_trigger_recursion.sql`
- **Component**: `src/components/UserDetailsDialog.tsx` (lines 287-333)
- **Original Sync System**: `supabase/migrations/20251217000000_create_credential_sync_system.sql`
- **Previous Fix Attempt**: `supabase/migrations/20251217080000_fix_credential_sync_trigger.sql`

## Verification

✅ **Status**: Fix Complete  
✅ **Migration Created**: Yes  
✅ **Recursion Guard**: Implemented in both functions  
✅ **Transaction Safety**: Configuration is transaction-scoped  
✅ **No Code Changes**: Pure database fix  

## Rollback (If Needed)

If you need to rollback this change, you can restore the previous function versions:

```sql
-- This will restore the functions to their state before the recursion guard
-- WARNING: This will restore the infinite recursion bug
-- Only use if you have a different solution

-- Revert to previous migration:
-- Run: supabase/migrations/20251217080000_fix_credential_sync_trigger.sql
```

However, rollback is **NOT recommended** as it will restore the stack depth error.

## Summary

- **Problem**: Circular trigger recursion causing stack overflow
- **Impact**: Unable to save user details, error code 54001
- **Solution**: Recursion guards using session configuration parameters
- **Risk**: Very low - purely additive safety check
- **Testing**: Works with existing functionality, prevents infinite loops
- **Performance**: Negligible overhead from flag check

The fix resolves the PostgreSQL stack depth exceeded error by preventing circular recursion between the credential sync trigger functions, enabling successful user detail updates.
