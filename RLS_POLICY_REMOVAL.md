# RLS Policy Removal - Database Changes

## Overview
This document describes the database migration that removes role-based Row-Level Security (RLS) policies to align the database security model with the UI changes that previously removed role-based access controls.

## Problem Statement
After the UI changes removed role-based access controls (PR #19), users were unable to see data on most pages because:
1. The UI removed role checks and set `isAdmin=true` and `isSupportStaff=true` for all authenticated users
2. The database RLS policies still enforced role-based restrictions using `has_role(auth.uid(), 'admin')` etc.
3. When users queried tables, the RLS policies rejected requests because users didn't have roles in the `user_roles` table
4. This resulted in empty data arrays being returned, so the UI showed field skeletons but no actual data

## Solution
Created migration `20251112204108_remove_role_based_rls_policies.sql` that:
- Drops all existing role-based RLS policies across 21 tables
- Creates new policies that allow all authenticated users full access (SELECT, INSERT, UPDATE, DELETE)
- Keeps RLS enabled to ensure users must be authenticated
- Preserves admin-only access to the `user_roles` table for future role management

## Tables Affected
The following 21 tables had their RLS policies updated:

### Core Tables
- `profiles` - User profile information
- `tickets` - Support tickets
- `ticket_comments` - Comments on tickets
- `ticket_time_logs` - Time tracking for tickets

### Asset Management
- `assets` - Asset tracking
- `hardware_inventory` - Hardware inventory
- `software_inventory` - Software inventory
- `licenses` - Software licenses

### Work Management
- `jobs` - Jobs and projects
- `job_update_requests` - Job update requests
- `maintenance_requests` - Maintenance requests

### Location & Network
- `branches` - Branch/location information
- `network_devices` - Network device inventory
- `internet_connectivity` - Internet connectivity information
- `network_diagrams` - Network topology diagrams

### Credentials & Access
- `vpn_rdp_credentials` - VPN and RDP credentials
- `remote_sessions` - Remote support sessions
- `remote_clients` - Remote client information

### Communication
- `provider_emails` - Provider email information
- `chat_messages` - Chat and messaging

### Microsoft 365
- `directory_users` - Microsoft 365 directory users

## Policy Changes

### Before
Policies used role-based checks like:
```sql
CREATE POLICY "Admins and CEOs can view all jobs"
  ON public.jobs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
  );
```

### After
Policies now allow all authenticated users:
```sql
CREATE POLICY "Authenticated users can view all jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);
```

## Security Implications

### What Changed
- **Authentication Required**: Users must still be authenticated to access any data (RLS is still enabled)
- **Role Checks Removed**: No role-based access control at the database level
- **Full Access**: All authenticated users have full CRUD access to all tables (except `user_roles`)

### What Stayed The Same
- **user_roles table**: Still restricted to admin-only access for future role management
- **RLS Enabled**: All tables still have RLS enabled, ensuring unauthenticated users cannot access data
- **Authentication**: Users must still log in to access the application

### Recommendations
1. **Backend Validation**: If needed, implement additional server-side validation for sensitive operations
2. **Audit Logging**: Consider adding audit logging for sensitive actions
3. **Future RBAC**: The `user_roles` table and `has_role()` function remain in place for potential future use
4. **Application-Level Controls**: Consider implementing application-level access controls if granular permissions are needed

## Migration Details

### File
`supabase/migrations/20251112204108_remove_role_based_rls_policies.sql`

### Statistics
- **88** DROP POLICY statements (removing old role-based policies)
- **69** CREATE POLICY statements (creating new authenticated-only policies)
- **536** total lines of SQL
- **21** tables updated

### Execution
This migration will be automatically applied when:
1. The PR is merged
2. The Supabase project pulls the latest migrations
3. Or when running `supabase db push` or `supabase db reset` locally

## Testing

### Manual Testing Steps
1. Log in with any authenticated user
2. Navigate to previously restricted pages:
   - Reports (`/reports`)
   - System Users (`/users`)
   - VPN Credentials (`/vpn`)
   - RDP Credentials (`/rdp`)
   - Jobs (`/jobs`)
   - Hardware Inventory (`/hardware`)
   - Software Inventory (`/software`)
   - Assets (`/assets`)
3. Verify that:
   - Pages load without "Access Denied" errors
   - Data populates correctly in tables and lists
   - CRUD operations work (create, read, update, delete)

### Expected Behavior
- **Before Migration**: Pages load but show empty tables (no data)
- **After Migration**: Pages load and show all data

## Rollback Plan
If needed, the migration can be rolled back by:
1. Creating a new migration that restores the role-based policies
2. Referencing previous migrations like `20251112184500_fix_ceo_permissions.sql` for the original policy definitions
3. Running `supabase db push` with the rollback migration

## Related Changes
- **UI Changes**: PR #19 (`copilot/remove-all-page-restrictions`)
- **Previous Migration**: `20251112184500_fix_ceo_permissions.sql` (last role-based update)
- **Documentation**: `PERMISSIONS_REMOVED_SUMMARY.md`

## Notes
- The `has_role()` function and `app_role` enum type are still defined in the database
- The `user_roles` table is still present and can be used in the future
- This change makes the database security model consistent with the UI access controls
- Future role-based access control can be re-implemented if needed by creating new migrations

## Support
For questions or issues:
1. Check browser console for errors
2. Check Supabase Dashboard → Database → Policies to verify policies are applied
3. Test queries in Supabase SQL Editor to verify data access
4. Contact the development team if data still doesn't populate

---
**Migration Created**: 2025-11-12
**Author**: Copilot Agent
**Issue**: Data not populating due to RLS policies
