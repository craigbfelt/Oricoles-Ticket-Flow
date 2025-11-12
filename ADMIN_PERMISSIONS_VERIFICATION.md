# Admin Permissions Verification Checklist

This document provides a comprehensive checklist to verify that an admin account has full permissions across all pages and functions in the Oricol Helpdesk application.

## Prerequisites

- Admin account created: `admin@oricol.co.za`
- Successfully logged into the application
- Can access the dashboard

## Navigation Menu Verification

Login as admin and verify all menu items are visible:

### All Users Have Access To:
- [ ] Dashboard - Home page with statistics
- [ ] Tickets - Ticket management system
- [ ] Remote Support - Remote assistance tools

### Admin/CEO/Support Staff Have Access To:
- [ ] Jobs - Job tracking and management
- [ ] Maintenance - Maintenance request management
- [ ] Logistics - Logistics and shipping
- [ ] Assets - Asset and equipment tracking
- [ ] Branches - Branch/location management
- [ ] Microsoft 365 - M365 user directory
- [ ] Hardware - Hardware inventory
- [ ] Software - Software inventory and licenses
- [ ] Licenses - License management
- [ ] Provider Emails - Email provider configuration
- [ ] VPN - VPN credentials management
- [ ] RDP - RDP credentials management
- [ ] Reports - Reporting and analytics

### Admin ONLY:
- [ ] Users - System user and role management (CRITICAL TEST)

## Functional Permissions Verification

### Dashboard Page (`/dashboard`)
- [ ] Can view ticket statistics
- [ ] Can view asset statistics
- [ ] Can view recent activity
- [ ] No errors in console

### Tickets Page (`/tickets`)
As Admin, verify:
- [ ] Can view all tickets (not just own tickets)
- [ ] Can create new tickets
- [ ] Can edit any ticket
- [ ] Can update ticket status
- [ ] Can assign tickets to users
- [ ] Can add comments to any ticket
- [ ] Can delete tickets
- [ ] Can close tickets
- [ ] Can view ticket details

### Assets Page (`/assets`)
As Admin, verify:
- [ ] Can view all assets
- [ ] Can create new assets
- [ ] Can edit existing assets
- [ ] Can delete assets
- [ ] Can assign assets to users
- [ ] Can update asset status
- [ ] Can view asset details

### Users Page (`/users`) - ADMIN ONLY
This is the most critical test for admin permissions:
- [ ] Can access the Users page (if not, admin role is not working)
- [ ] Can view "System Users" tab
- [ ] Can view all system user profiles
- [ ] Can see user roles for each account
- [ ] Can edit user information
- [ ] Can assign/remove roles:
  - [ ] Can assign 'admin' role
  - [ ] Can assign 'ceo' role
  - [ ] Can assign 'support_staff' role
  - [ ] Can assign 'user' role (default)
  - [ ] Can assign multiple roles to a user
- [ ] Can view VPN credentials tab
- [ ] Can view RDP credentials tab
- [ ] Can view 365 Directory tab
- [ ] Can manage staff members

### Microsoft 365 Dashboard (`/microsoft-365`)
- [ ] Can view directory users
- [ ] Can search users
- [ ] Can view user details
- [ ] No access denied errors

### Hardware Inventory (`/hardware`)
- [ ] Can view hardware items
- [ ] Can create new hardware entries
- [ ] Can edit hardware information
- [ ] Can delete hardware items

### Software Inventory (`/software`)
- [ ] Can view software items
- [ ] Can create new software entries
- [ ] Can edit software information
- [ ] Can delete software items

### Licenses (`/licenses`)
- [ ] Can view all licenses
- [ ] Can create new licenses
- [ ] Can edit license information
- [ ] Can delete licenses
- [ ] Can assign licenses to users

### VPN Page (`/vpn`)
- [ ] Can view VPN credentials
- [ ] Can create new VPN credentials
- [ ] Can edit existing credentials
- [ ] Can delete credentials
- [ ] Can view passwords (sensitive data)

### RDP Page (`/rdp`)
- [ ] Can view RDP credentials
- [ ] Can create new RDP credentials
- [ ] Can edit existing credentials
- [ ] Can delete credentials
- [ ] Can view passwords (sensitive data)

### Jobs Page (`/jobs`)
- [ ] Can view all jobs
- [ ] Can create new jobs
- [ ] Can edit jobs
- [ ] Can update job status
- [ ] Can delete jobs

### Maintenance Page (`/maintenance`)
- [ ] Can view maintenance requests
- [ ] Can create maintenance requests
- [ ] Can edit requests
- [ ] Can update request status

### Branches Page (`/branches`)
- [ ] Can view all branches
- [ ] Can create new branches
- [ ] Can edit branch information
- [ ] Can delete branches

### Reports Page (`/reports`)
- [ ] Can access reports
- [ ] Can view various report types
- [ ] Can generate reports
- [ ] Can export data

### Remote Support (`/remote-support`)
- [ ] Can access remote support tools
- [ ] Can initiate remote sessions
- [ ] Can view remote client information

## Database Permission Verification

If you have access to Supabase dashboard, verify RLS policies:

### User Roles Table
- [ ] Admin can view all user roles
- [ ] Admin can insert new roles
- [ ] Admin can delete roles
- [ ] Admin can update roles

### Profiles Table
- [ ] Admin can view all profiles
- [ ] Admin can update any profile
- [ ] Admin can see email addresses

### Tickets Table
- [ ] Admin can view all tickets (not just assigned or created by them)
- [ ] Admin can insert tickets
- [ ] Admin can update any ticket
- [ ] Admin can delete tickets

### Assets Table
- [ ] Admin can view all assets
- [ ] Admin can insert assets
- [ ] Admin can update assets
- [ ] Admin can delete assets

### Ticket Comments Table
- [ ] Admin can view all comments
- [ ] Admin can insert comments on any ticket
- [ ] Admin can view comment history

## Console Error Check

For each page visited:
- [ ] No "Access Denied" errors in browser console
- [ ] No "Permission Denied" errors in browser console
- [ ] No RLS policy violations in network tab
- [ ] No 403 Forbidden responses

## Role Assignment Test

### Test 1: Assign Admin Role to Another User
1. [ ] Navigate to Users page
2. [ ] Select a test user
3. [ ] Add 'admin' role
4. [ ] Save changes
5. [ ] Verify role is saved
6. [ ] Log in as that user
7. [ ] Verify they can access Users page

### Test 2: Assign CEO Role
1. [ ] Navigate to Users page
2. [ ] Select a test user
3. [ ] Add 'ceo' role
4. [ ] Save changes
5. [ ] Log in as CEO user
6. [ ] Verify they can access all pages except Users (System Users management)

### Test 3: Assign Support Staff Role
1. [ ] Navigate to Users page
2. [ ] Select a test user
3. [ ] Add 'support_staff' role
4. [ ] Save changes
5. [ ] Log in as support staff user
6. [ ] Verify they can access tickets, users, reports, VPN, RDP, remote support

### Test 4: Regular User Role
1. [ ] Create a new user account
2. [ ] Log in (should only have 'user' role by default)
3. [ ] Verify they can ONLY see:
   - [ ] Dashboard
   - [ ] Tickets (only their own)
   - [ ] Remote Support
4. [ ] Verify they CANNOT see:
   - [ ] Users page
   - [ ] Assets page
   - [ ] VPN page
   - [ ] RDP page
   - [ ] Jobs page
   - [ ] Hardware/Software pages

## Security Verification

- [ ] Cannot view other users' passwords in the database
- [ ] Cannot directly modify auth.users table (requires superuser)
- [ ] RLS policies prevent unauthorized access
- [ ] Admin role required for sensitive operations

## Common Issues and Solutions

### Issue: Cannot see Users page
**Symptom:** Users menu item not visible or Access Denied error

**Check:**
```sql
-- Run in Supabase SQL Editor
SELECT ur.role, p.email, p.full_name
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'admin@oricol.co.za';
```

**Expected Result:** Should show 'admin' role (and 'user' role)

**Fix if missing:**
```sql
-- Get user ID first
SELECT id FROM auth.users WHERE email = 'admin@oricol.co.za';

-- Insert admin role (replace UUID with actual user ID)
INSERT INTO user_roles (user_id, role)
VALUES ('<USER_ID_HERE>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Issue: Can see Users page but cannot edit roles
**Symptom:** Edit button doesn't work or changes don't save

**Check:** Verify RLS policies on user_roles table
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_roles';
```

### Issue: Access Denied on specific pages
**Symptom:** Some pages show Access Denied

**Check:** The checkAccess() function in each page component
- Dashboard.tsx - requires any authenticated user
- Tickets.tsx - requires any authenticated user
- Assets.tsx - requires admin, ceo, or support_staff
- Users.tsx - requires admin only

## Sign-Off

After completing all checks above:

- **Tester Name:** ___________________________
- **Date:** ___________________________
- **Admin Email Used:** admin@oricol.co.za
- **All Tests Passed:** [ ] Yes [ ] No
- **Issues Found:** ___________________________
- **Notes:** ___________________________

## Verification Script

For automated testing, you can use this SQL query to verify the admin setup:

```sql
-- Comprehensive admin verification query
WITH admin_user AS (
  SELECT id, email 
  FROM auth.users 
  WHERE email = 'admin@oricol.co.za'
),
admin_profile AS (
  SELECT * 
  FROM profiles 
  WHERE user_id = (SELECT id FROM admin_user)
),
admin_roles AS (
  SELECT role 
  FROM user_roles 
  WHERE user_id = (SELECT id FROM admin_user)
)
SELECT 
  'User Exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM admin_user) THEN 'PASS ✓' ELSE 'FAIL ✗' END as status,
  (SELECT email FROM admin_user) as details
UNION ALL
SELECT 
  'Profile Exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM admin_profile) THEN 'PASS ✓' ELSE 'FAIL ✗' END as status,
  (SELECT full_name FROM admin_profile) as details
UNION ALL
SELECT 
  'Has Admin Role' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM admin_roles WHERE role = 'admin') THEN 'PASS ✓' ELSE 'FAIL ✗' END as status,
  (SELECT string_agg(role::text, ', ') FROM admin_roles) as details
UNION ALL
SELECT 
  'Has User Role' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM admin_roles WHERE role = 'user') THEN 'PASS ✓' ELSE 'FAIL ✗' END as status,
  'Default role for all users' as details;
```

Expected output:
```
check_type        | status   | details
------------------+----------+-------------------------
User Exists       | PASS ✓   | admin@oricol.co.za
Profile Exists    | PASS ✓   | System Administrator
Has Admin Role    | PASS ✓   | admin, user
Has User Role     | PASS ✓   | Default role for all users
```

All checks should show "PASS ✓" for the admin account to be properly configured.
