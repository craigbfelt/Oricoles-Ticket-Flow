# Quick Fix: User Details Save Error (Code 27000)

## What's the Problem?

When you click "Save" after editing user details in the UserDetailsDialog, you get this error:

```
Error saving user details: 
code: "27000"
message: "tuple to be updated was already modified by an operation triggered by the current command"
hint: "Consider using an AFTER trigger instead of a BEFORE trigger to propagate changes to other rows."
```

## What's the Solution?

A database migration that fixes the circular trigger pattern causing the error.

## How to Apply the Fix (3 Steps)

### Step 1: Access Supabase SQL Editor

1. Go to your **Supabase project dashboard**
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Copy and Run the Migration

1. Open this file: `supabase/migrations/20251219065429_fix_circular_trigger_updates.sql`
2. Copy the **entire contents** of the file
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Step 3: Verify Success

You should see a message like:
```
Success. No rows returned
```

This is expected - the migration doesn't return data, it just fixes the triggers.

## Test the Fix

1. Open your application
2. Go to the user list page
3. Click on any user to open the details dialog
4. Edit some credentials (VPN, RDP, or M365)
5. Click **Save**
6. ✅ It should save successfully without the error!

## What Did the Fix Do?

The migration:
- ✅ Removed the circular trigger that was causing the conflict
- ✅ Changed the sync trigger to use AFTER timing (per PostgreSQL's hint)
- ✅ Added a separate trigger for timestamp updates
- ✅ Maintained data synchronization between tables

## Technical Details

**Root Cause:** Two triggers creating a circular update loop:
```
master_user_list UPDATE → vpn_rdp_credentials UPDATE → master_user_list UPDATE (CONFLICT!)
```

**Solution:** Remove the reverse sync trigger, keep only forward sync:
```
master_user_list UPDATE → vpn_rdp_credentials UPDATE → ✓ Done!
```

## Still Having Issues?

If you still see the error after applying the migration:

1. **Check the triggers were updated:**
   ```sql
   SELECT trigger_name, action_timing
   FROM information_schema.triggers
   WHERE event_object_table = 'master_user_list';
   ```
   
   You should see `sync_credentials_trigger` with `AFTER` timing.

2. **Verify the reverse trigger was removed:**
   ```sql
   SELECT trigger_name
   FROM information_schema.triggers
   WHERE event_object_table = 'vpn_rdp_credentials'
   AND trigger_name = 'sync_credentials_to_master_trigger';
   ```
   
   This should return **0 rows** (trigger removed).

3. **Check for conflicts:**
   Look in your database logs for any error messages when saving user details.

## Need More Information?

See the comprehensive guide: [FIX_CIRCULAR_TRIGGER_ERROR.md](./FIX_CIRCULAR_TRIGGER_ERROR.md)

## Summary

✅ **What to do:** Run the SQL migration in Supabase  
✅ **Where:** SQL Editor in Supabase Dashboard  
✅ **File:** `supabase/migrations/20251219065429_fix_circular_trigger_updates.sql`  
✅ **Time:** Takes < 1 second to run  
✅ **Risk:** Low - only fixes triggers, doesn't change data  
✅ **Rollback:** Can be reversed if needed (see full guide)  

**The fix is ready! Just run the migration in Supabase and you're done.**
