# Fix for Circular Trigger Error (Code 27000)

## Problem

When saving user details in the UserDetailsDialog component, the following error occurred:

```
Error saving user details: 
{
  code: "27000",
  message: "tuple to be updated was already modified by an operation triggered by the current command",
  hint: "Consider using an AFTER trigger instead of a BEFORE trigger to propagate changes to other rows."
}
```

## Root Cause

The error was caused by a **circular trigger pattern** between two database tables:

1. **UPDATE on `master_user_list`** → triggers `sync_credentials_trigger` (was BEFORE trigger)
2. This trigger **UPDATEs `vpn_rdp_credentials`** table with synced credentials
3. **UPDATE on `vpn_rdp_credentials`** → triggers `sync_credentials_to_master_trigger` (AFTER trigger)
4. This reverse trigger tries to **UPDATE `master_user_list` again** (circular loop!)
5. PostgreSQL detects that the row being updated was already modified by the current command and throws error code **27000**

### The Circular Pattern

```
master_user_list (UPDATE)
    ↓ sync_credentials_trigger (BEFORE)
vpn_rdp_credentials (UPDATE)
    ↓ sync_credentials_to_master_trigger (AFTER)
master_user_list (UPDATE AGAIN!) ← ERROR: Row already being modified!
```

## Solution

The fix involves two key changes:

### 1. Remove Reverse Sync Trigger

**Dropped:** `sync_credentials_to_master_trigger` on `vpn_rdp_credentials`

This trigger was attempting to sync changes back from `vpn_rdp_credentials` to `master_user_list`. However, this is unnecessary because:
- The `UserDetailsDialog` component already updates `master_user_list` directly
- The forward sync (master_user_list → vpn_rdp_credentials) is sufficient
- Removing it eliminates the circular update pattern

### 2. Change Forward Sync to AFTER Trigger

**Changed:** `sync_credentials_trigger` from `BEFORE` to `AFTER` trigger

Following PostgreSQL's hint, we changed the timing:
- **Before:** BEFORE trigger modified NEW record during the update
- **After:** AFTER trigger propagates changes to other rows after the update completes

### 3. Separate Timestamp Update

Created a dedicated `BEFORE` trigger for updating `credentials_updated_at`:
- The timestamp update needs BEFORE timing to modify the NEW record
- The credential sync needs AFTER timing to avoid conflicts
- Separating them allows each to use the correct timing

## Migration Details

**Migration File:** `supabase/migrations/20251219065429_fix_circular_trigger_updates.sql`

The migration performs these operations:

1. **Drops the reverse sync trigger and function** that caused circular updates
2. **Recreates the forward sync function** with proper error handling
3. **Changes sync_credentials_trigger to AFTER timing** (from BEFORE)
4. **Creates a separate BEFORE trigger** for updating credentials_updated_at timestamp
5. **Adds comprehensive documentation** as SQL comments

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251219065429_fix_circular_trigger_updates.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor and click **Run**

### Option 2: Using Supabase CLI

```bash
cd /home/runner/work/Oricoles-Ticket-Flow/Oricoles-Ticket-Flow
npx supabase db push
```

### Option 3: Using npm Script

```bash
npm run migrate:apply
```

## Verification

After applying the migration, verify the triggers are correctly configured:

```sql
-- Check triggers on master_user_list
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'master_user_list';

-- Expected results:
-- 1. sync_credentials_trigger (UPDATE, AFTER)
-- 2. update_credentials_timestamp_trigger (UPDATE, BEFORE)
-- 3. update_master_user_list_updated_at (UPDATE, BEFORE)

-- Check triggers on vpn_rdp_credentials (should have NO reverse sync trigger)
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'vpn_rdp_credentials';

-- Should NOT include: sync_credentials_to_master_trigger
```

## Testing the Fix

1. Open the application
2. Navigate to the user list
3. Click on a user to open the UserDetailsDialog
4. Edit credentials (VPN, RDP, or M365)
5. Click **Save**
6. The save should now succeed without the code 27000 error

## Data Flow After Fix

```
UserDetailsDialog
    ↓ Direct UPDATE
master_user_list (UPDATE completes successfully)
    ↓ sync_credentials_trigger (AFTER - no conflicts)
vpn_rdp_credentials (UPDATE)
    ↓ (no reverse trigger - no circular updates!)
✓ SUCCESS
```

## Benefits

✅ **Eliminates circular update errors** (code 27000)  
✅ **Follows PostgreSQL best practices** (AFTER trigger for cross-table updates)  
✅ **Maintains data consistency** between master_user_list and vpn_rdp_credentials  
✅ **Simpler data flow** - unidirectional sync (master → credentials)  
✅ **Preserves single source of truth** - master_user_list remains authoritative  
✅ **No code changes required** - purely database-level fix  

## Technical Details

### Trigger Timing Comparison

| Trigger Type | When It Fires | Can Modify NEW | Can Update Other Tables |
|--------------|---------------|----------------|-------------------------|
| **BEFORE** | Before the row is written | ✅ Yes | ⚠️ Can cause conflicts |
| **AFTER** | After the row is written | ❌ No (too late) | ✅ Safe for cross-table updates |

### Why AFTER Triggers Prevent the Error

When using AFTER triggers:
1. The original UPDATE on `master_user_list` completes first
2. Row is fully committed to the table
3. AFTER trigger fires and updates `vpn_rdp_credentials`
4. No conflict because the original row is no longer "being modified"

### Why BEFORE Triggers Caused the Error

When using BEFORE triggers:
1. UPDATE on `master_user_list` starts
2. BEFORE trigger fires mid-update
3. Trigger tries to UPDATE `vpn_rdp_credentials`
4. This triggers reverse sync, which tries to UPDATE `master_user_list` again
5. PostgreSQL detects: "Wait! This row is still being updated from step 1!"
6. Error code 27000: "tuple to be updated was already modified"

## Rollback (If Needed)

If you need to rollback this change (not recommended):

```sql
-- Re-create the reverse sync trigger and function
-- (See migration 20251217000000_create_credential_sync_system.sql)

-- WARNING: Rolling back will restore the circular update error
```

## Related Files

- **Migration:** `supabase/migrations/20251219065429_fix_circular_trigger_updates.sql`
- **Component:** `src/components/UserDetailsDialog.tsx` (lines 239-421)
- **Original Sync Migration:** `supabase/migrations/20251217000000_create_credential_sync_system.sql`
- **Previous Fix Attempt:** `supabase/migrations/20251217080000_fix_credential_sync_trigger.sql`

## Summary

✅ **Status**: Fix Complete  
✅ **Error Code**: 27000 (tuple already modified)  
✅ **Solution**: Remove reverse sync trigger + use AFTER trigger  
✅ **Impact**: Database only (no application code changes)  
✅ **Risk**: Low (removes problematic trigger, maintains forward sync)  
✅ **Build**: Successful  
✅ **Testing**: Ready for manual verification  

The fix resolves PostgreSQL error 27000 by eliminating the circular trigger pattern and following the database's recommendation to use AFTER triggers for cross-table propagation.
