# Testing Guide: Stack Depth Fix

## Testing the Circular Trigger Recursion Fix

This guide explains how to verify that the stack depth fix is working correctly.

## Prerequisites

- The migration `20251217091500_fix_circular_trigger_recursion.sql` has been applied
- You have access to Supabase SQL Editor or psql
- You have at least one test user in the `master_user_list` table

## Test Scenarios

### Test 1: Update master_user_list (Should Not Cause Recursion)

This tests the main path: updating credentials in `master_user_list` should sync to `vpn_rdp_credentials` without causing infinite recursion.

```sql
-- Get a test user email
SELECT email, vpn_username, rdp_username 
FROM master_user_list 
WHERE is_active = true 
LIMIT 1;

-- Update the VPN username (this would previously cause stack overflow)
UPDATE master_user_list 
SET vpn_username = 'test_vpn_' || floor(random() * 1000)::text
WHERE email = 'your_test_email@example.com';

-- Verify the update worked and synced to vpn_rdp_credentials
SELECT 
  m.email,
  m.vpn_username as master_vpn,
  v.username as cred_vpn
FROM master_user_list m
LEFT JOIN vpn_rdp_credentials v 
  ON LOWER(m.email) = LOWER(v.email) 
  AND v.service_type = 'VPN'
WHERE m.email = 'your_test_email@example.com';
```

**Expected Result**: 
- ✅ Update completes successfully
- ✅ No stack depth error
- ✅ Both tables show the same new username
- ✅ Query returns in < 1 second

### Test 2: Update vpn_rdp_credentials (Should Not Cause Recursion)

This tests the reverse path: updating credentials in `vpn_rdp_credentials` should sync back to `master_user_list` without causing infinite recursion.

```sql
-- Update the credentials table directly
UPDATE vpn_rdp_credentials
SET username = 'reverse_test_' || floor(random() * 1000)::text
WHERE email = 'your_test_email@example.com'
  AND service_type = 'VPN';

-- Verify the sync back to master_user_list worked
SELECT 
  m.email,
  m.vpn_username as master_vpn,
  v.username as cred_vpn
FROM master_user_list m
LEFT JOIN vpn_rdp_credentials v 
  ON LOWER(m.email) = LOWER(v.email) 
  AND v.service_type = 'VPN'
WHERE m.email = 'your_test_email@example.com';
```

**Expected Result**: 
- ✅ Update completes successfully
- ✅ No stack depth error
- ✅ Both tables show the same new username
- ✅ Query returns in < 1 second

### Test 3: Multiple Rapid Updates (Stress Test)

This tests that the recursion guard works even with multiple rapid updates.

```sql
-- Run multiple updates in sequence
DO $$
DECLARE
  test_email TEXT;
BEGIN
  -- Get a test user
  SELECT email INTO test_email
  FROM master_user_list 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Perform 5 rapid updates
  FOR i IN 1..5 LOOP
    UPDATE master_user_list 
    SET vpn_username = 'stress_test_' || i::text
    WHERE email = test_email;
    
    RAISE NOTICE 'Update % completed', i;
  END LOOP;
END $$;

-- Verify final state
SELECT email, vpn_username, rdp_username 
FROM master_user_list 
WHERE is_active = true 
LIMIT 1;
```

**Expected Result**: 
- ✅ All 5 updates complete successfully
- ✅ No stack depth errors
- ✅ Final value is 'stress_test_5'
- ✅ All updates complete in < 5 seconds total

### Test 4: Application-Level Test (UserDetailsDialog)

This tests the actual user interface that was experiencing the error.

**Steps**:
1. Log in to the application
2. Navigate to the Users page (or dashboard with user list)
3. Click on a user to open UserDetailsDialog
4. Make changes to:
   - VPN Username
   - VPN Password
   - RDP Username
   - RDP Password
5. Click **Save**

**Expected Result**:
- ✅ Success toast appears: "User details updated successfully"
- ✅ No error in console
- ✅ Dialog remains open showing updated values
- ✅ Changes are persisted (close and reopen to verify)

### Test 5: Verify Recursion Guard is Active

This test verifies that the recursion guard is actually preventing circular calls.

```sql
-- Enable query logging (if available in your environment)
-- Check that the guard is working by examining function calls

-- First, verify the guard parameter works
DO $$
BEGIN
  -- Set the guard manually
  PERFORM set_config('app.in_credential_sync', 'true', true);
  
  -- Check it's set
  IF current_setting('app.in_credential_sync', true) = 'true' THEN
    RAISE NOTICE 'Recursion guard parameter is working correctly';
  ELSE
    RAISE EXCEPTION 'Recursion guard parameter is NOT working';
  END IF;
END $$;
```

**Expected Result**: 
- ✅ Notice: "Recursion guard parameter is working correctly"

## Troubleshooting

### If Tests Fail

1. **Check Migration Was Applied**:
   ```sql
   SELECT EXISTS(
     SELECT 1 
     FROM pg_proc 
     WHERE proname = 'sync_credentials_from_master'
     AND prosrc LIKE '%app.in_credential_sync%'
   ) as has_recursion_guard;
   ```
   Should return `true`.

2. **Check Trigger Exists**:
   ```sql
   SELECT tgname, tgrelid::regclass, tgfoid::regproc
   FROM pg_trigger
   WHERE tgname IN ('sync_credentials_trigger', 'sync_credentials_to_master_trigger');
   ```
   Should return both triggers.

3. **Check for Other Errors**:
   ```sql
   -- Look for any constraint violations or other errors
   SELECT * FROM pg_stat_activity 
   WHERE state = 'idle in transaction (aborted)';
   ```

### Common Issues

**Issue**: Still getting stack depth error
- **Solution**: Ensure migration was applied correctly. Re-run the migration.

**Issue**: Changes not syncing between tables
- **Solution**: Check that both triggers are enabled:
  ```sql
  SELECT tgname, tgenabled FROM pg_trigger 
  WHERE tgname IN ('sync_credentials_trigger', 'sync_credentials_to_master_trigger');
  ```

**Issue**: Password not syncing
- **Solution**: This is expected for '***ENCRYPTED***' values. The functions preserve existing passwords when syncing.

## Success Criteria

All tests should:
- ✅ Complete without errors
- ✅ Not trigger stack depth exceeded error (code 54001)
- ✅ Sync data correctly between tables
- ✅ Complete within reasonable time (< 5 seconds for all operations)
- ✅ Allow the user to save details in the UI successfully

## Performance Benchmarks

Expected performance with the recursion guard:

- Single update: < 100ms
- 10 sequential updates: < 1 second
- 100 sequential updates: < 10 seconds
- UI save operation: < 500ms

If performance is significantly worse, there may be an unrelated issue with database indexes or network latency.

## Rollback Plan

If the fix causes unexpected issues:

1. **Disable the triggers temporarily**:
   ```sql
   ALTER TABLE master_user_list DISABLE TRIGGER sync_credentials_trigger;
   ALTER TABLE vpn_rdp_credentials DISABLE TRIGGER sync_credentials_to_master_trigger;
   ```

2. **Re-enable after investigation**:
   ```sql
   ALTER TABLE master_user_list ENABLE TRIGGER sync_credentials_trigger;
   ALTER TABLE vpn_rdp_credentials ENABLE TRIGGER sync_credentials_to_master_trigger;
   ```

3. **Or revert to previous function version** (see STACK_DEPTH_FIX.md for details)
