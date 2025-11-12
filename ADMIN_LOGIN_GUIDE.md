# System Admin Login & Full Access Guide

## Problem Summary
After recent changes, users were experiencing:
- Cannot add tickets
- Cannot see most tabs on dashboard
- Permissions/system users need rebuild
- System admin login not working properly

## Root Causes Identified

### 1. TypeScript Type Mismatch
The `app_role` enum in the database included 'ceo' but the TypeScript types file did not. This caused type errors and potential runtime issues.

**Fixed:** Updated `src/integrations/supabase/types.ts` to include 'ceo' in the enum.

### 2. Incomplete RLS Policies
Many database tables had Row Level Security (RLS) policies that only checked for 'admin' or 'support_staff' roles, but not 'ceo'. This prevented CEOs from accessing data they should be able to see.

**Fixed:** Created comprehensive migration `20251112184500_fix_ceo_permissions.sql` that updates all RLS policies to include CEO role where appropriate.

## System Admin Access

### Pre-configured Admin Accounts

The following email addresses automatically receive admin role when they sign up:

1. **craig@zerobitone.co.za** - Primary system administrator
2. **admin@oricol.co.za** - Secondary admin account

### How to Enable System Admin Login

#### Option 1: Use Existing Admin Account (Recommended)

If you already have an account with one of the pre-configured admin emails:

1. **Log in** to the application with your credentials
2. **Verify admin access** by checking if you can see the "Users" menu item in the sidebar
3. All tabs and functionality should now be visible

#### Option 2: Create New Admin Account via Supabase Dashboard

If you need to create a new admin account:

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com
   - Open your project: kwmeqvrmtivmljujwocp

2. **Create User**
   - Click "Authentication" → "Users"
   - Click "Add user" → "Create new user"
   - Email: `craig@zerobitone.co.za` (or `admin@oricol.co.za`)
   - Password: Choose a strong password
   - Check "Auto Confirm User"
   - Click "Create user"

3. **Verify Role Assignment**
   The system will automatically:
   - Create a profile for the user
   - Assign 'admin' role (via trigger function)
   - Assign 'user' role (default for all users)

4. **Test Login**
   - Go to your application
   - Log in with the new credentials
   - Verify you can see all menu items including "Users"

#### Option 3: Manually Assign Admin Role (Advanced)

If you have an existing user that needs admin access:

1. **Get User ID**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. **Assign Admin Role**
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID_FROM_STEP_1', 'admin'::app_role)
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. **Log Out and Log Back In**
   - The user needs to log out and log back in for the new role to take effect

## Role Hierarchy & Permissions

### Admin Role (Full System Access)
- ✅ Dashboard
- ✅ Tickets (create, view, edit, delete all)
- ✅ Remote Support
- ✅ Jobs
- ✅ Maintenance
- ✅ Logistics
- ✅ Assets (full CRUD)
- ✅ Branches (full CRUD)
- ✅ Microsoft 365
- ✅ Hardware Inventory (full CRUD)
- ✅ Software Inventory (full CRUD)
- ✅ Licenses (full CRUD)
- ✅ Provider Emails
- ✅ VPN Credentials (full CRUD)
- ✅ RDP Credentials (full CRUD)
- ✅ Reports
- ✅ **Users (System Users management)**

### CEO Role
- ✅ All of the above **EXCEPT**
- ❌ Cannot manage system users (cannot edit user_roles table)
- Can view Users page but cannot modify roles

### Support Staff Role
- ✅ Dashboard
- ✅ Tickets (view all, create, update)
- ✅ Remote Support
- ✅ Jobs (view, create, update)
- ✅ Maintenance (view, create, update)
- ✅ Logistics
- ✅ Assets (view only)
- ✅ Branches (view)
- ✅ Microsoft 365 (view)
- ✅ Hardware Inventory (view)
- ✅ Software Inventory (view)
- ✅ Licenses (view)
- ✅ Provider Emails
- ✅ VPN Credentials (view only)
- ✅ RDP Credentials (view only)
- ✅ Reports
- ✅ Users (view only)

### User Role (Basic Access)
- ✅ Dashboard (limited view)
- ✅ Tickets (own tickets only)
- ✅ Remote Support

## Troubleshooting

### Issue: "Cannot add tickets"

**Possible Causes:**
1. User doesn't have proper role assigned
2. RLS policies are blocking access
3. Database migration not applied

**Solution:**
1. Check user roles in database:
   ```sql
   SELECT ur.role, p.email 
   FROM user_roles ur 
   JOIN profiles p ON p.user_id = ur.user_id 
   WHERE p.email = 'your-email@example.com';
   ```

2. Ensure user has at least 'user' role
3. Apply latest migrations:
   ```bash
   npx supabase db reset  # For local dev
   ```

### Issue: "Cannot see most tabs on dashboard"

**Possible Causes:**
1. User role not properly checked in DashboardLayout.tsx
2. Role not assigned in database

**Solution:**
1. Verify roles are being fetched correctly (check browser console for errors)
2. Ensure user has appropriate role (admin, ceo, or support_staff for full access)
3. Log out and log back in to refresh session

### Issue: "System admin cannot access everything"

**Possible Causes:**
1. Admin role not assigned
2. RLS policies not updated
3. Migration not applied

**Solution:**
1. Verify admin role in database
2. Apply migration `20251112184500_fix_ceo_permissions.sql`
3. Check that user_roles table has entry for the user with role='admin'

## Verification Checklist

After fixing permissions, verify the following:

- [ ] Can log in with admin credentials
- [ ] Dashboard shows all statistics
- [ ] Can create new tickets
- [ ] Can view all tickets
- [ ] Can access Assets page
- [ ] Can access Branches page
- [ ] Can access Microsoft 365 page
- [ ] Can access Hardware Inventory page
- [ ] Can access Software Inventory page
- [ ] Can access Licenses page
- [ ] Can access VPN page
- [ ] Can access RDP page
- [ ] Can access Reports page
- [ ] Can access Users page (admin only)
- [ ] Can manage user roles (admin only)

## Database Migration Status

The following migrations have been applied to fix permissions:

1. ✅ `20251109045855` - Initial role-based access control
2. ✅ `20251112124800` - Added CEO role to enum
3. ✅ `20251112135110` - Restore admin role for craig@zerobitone.co.za
4. ✅ `20251112151903` - Auto-assign admin role
5. ✅ `20251112160000` - Allow CEO to view all profiles
6. ✅ `20251112161521` - Restore admin and CEO roles
7. ✅ `20251112170113` - Create new admin account setup
8. ✅ `20251112184500` - **Fix CEO permissions comprehensively** (NEW)

## Support

If you continue to have issues:

1. Check the browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify all migrations have been applied
4. Contact development team with:
   - User email
   - Specific error messages
   - Steps to reproduce the issue
