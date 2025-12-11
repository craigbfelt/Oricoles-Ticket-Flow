# Tenant Requirement Removal - Testing Guide

## Changes Made

### 1. CSVUserImporter.tsx
**Problem**: CSV import was failing with "tenant id not found" error when users weren't assigned to a tenant.

**Solution**: Made tenant_id optional throughout the import process:
- Changed from `.single()` to `.maybeSingle()` when fetching tenant membership
- Removed the error check that prevented import if tenant wasn't found
- Made tenant_id optional in all database inserts using spread operator pattern: `...(tenantId && { tenant_id: tenantId })`

**Affected Operations**:
- User insertion to `master_user_list` table
- Device assignments to `device_user_assignments` table
- Credential insertion to `vpn_rdp_credentials` table (VPN, RDP, M365)

### 2. Database Migration (20251211140000_remove_ceo_cfo_requirements.sql)
**Problem**: The `handle_new_user()` trigger was automatically assigning CEO role to specific users, which was causing complications.

**Solution**: 
- Removed automatic CEO role assignment for Graeme Smart
- Made tenant assignment optional with proper error handling
- Added exception handling so user creation doesn't fail if tenant doesn't exist
- Kept admin role assignments for specific admin accounts

## How to Test

### Test 1: CSV Import Without Tenant
1. Log in as a user who doesn't have tenant membership
2. Navigate to Dashboard → Import Users from CSV
3. Download the CSV template
4. Fill in sample data (at least full_name, display_name, or device_serial_number)
5. Upload the CSV file
6. Click "Import" button
7. **Expected Result**: Import should succeed without "tenant not found" error

### Test 2: CSV Import With Tenant
1. Log in as a user who has tenant membership (assigned via `user_tenant_memberships` table)
2. Follow same steps as Test 1
3. **Expected Result**: Import should succeed AND tenant_id should be populated in the database records

### Test 3: New User Creation
1. Create a new user through "Import from Staff Users" dialog
2. Check the database:
   - User should have a record in `profiles` table
   - User should have 'user' role in `user_roles` table
   - If default tenant exists, user should be in `user_tenant_memberships` table
   - If default tenant doesn't exist, user creation should still succeed
3. **Expected Result**: User creation succeeds regardless of tenant existence

### Test 4: Verify Data
After successful import, check these tables in Supabase:

```sql
-- Check imported users (tenant_id may be NULL)
SELECT * FROM master_user_list WHERE source = 'csv_import' ORDER BY imported_at DESC LIMIT 10;

-- Check device assignments (tenant_id may be NULL)
SELECT * FROM device_user_assignments WHERE assignment_source = 'csv_import' ORDER BY assignment_date DESC LIMIT 10;

-- Check credentials (tenant_id may be NULL)
SELECT email, username, service_type, tenant_id FROM vpn_rdp_credentials ORDER BY created_at DESC LIMIT 10;
```

## Backward Compatibility

✅ **Users WITH tenant assignments**: Will continue to work exactly as before, with tenant_id populated
✅ **Users WITHOUT tenant assignments**: Will now be able to import CSV data without errors
✅ **Existing data**: All existing records with tenant_id remain unchanged

## Database Schema

All these tables have nullable `tenant_id` columns:
- `master_user_list.tenant_id` - NULLABLE
- `device_user_assignments.tenant_id` - NULLABLE  
- `vpn_rdp_credentials.tenant_id` - NULLABLE
- `device_change_history.tenant_id` - NULLABLE
- `manual_devices.tenant_id` - NULLABLE

The unique constraint on `device_user_assignments` is scoped by tenant_id, so NULL values won't conflict.

## Migration Instructions

1. Apply the new migration:
   ```sql
   -- Run this in Supabase SQL Editor
   -- This will update the handle_new_user trigger
   ```
   The migration file is: `supabase/migrations/20251211140000_remove_ceo_cfo_requirements.sql`

2. No data migration needed - all changes are backward compatible

## Notes

- CEO/CFO role enum values are NOT removed from the database (to avoid breaking existing data)
- We only removed the automatic assignment logic
- The PermissionsContext still supports CEO/CFO roles for users who have them
- RLS policies were already simplified in migration `20251112204108_remove_role_based_rls_policies.sql` to use authenticated-only access
