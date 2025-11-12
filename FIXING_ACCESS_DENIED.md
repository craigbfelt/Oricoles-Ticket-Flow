# Fixing "Access Denied" Issues

## Problem Summary

User `craig@zerobitone.co.za` can log in and see all tabs/pages in the navigation, but when clicking on certain tabs, they get an "Access Denied" error message and are redirected back to the dashboard.

## Root Cause

The issue occurs when a user account exists in the authentication system but doesn't have the proper role assignments in the `user_roles` table. The pages check for specific roles using queries like:

```typescript
const { data } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", session.user.id)
  .in("role", ["admin", "ceo", "support_staff"])
  .maybeSingle();

if (!data) {
  // Access Denied!
  navigate("/dashboard");
}
```

If the user doesn't have any of the required roles, `.maybeSingle()` returns `null`, triggering the access denied flow.

## Pages Affected

The following pages have access restrictions and will show "Access Denied" if the user doesn't have the appropriate role:

| Page | Required Roles | Access Level |
|------|---------------|--------------|
| **Reports** | admin, ceo, support_staff | View reports and analytics |
| **Users (System Users)** | admin only | Manage system user accounts and roles |
| **VPN** | admin, ceo, support_staff | View and manage VPN credentials |
| **RDP** | admin, ceo, support_staff | View and manage RDP credentials |
| **Jobs** | admin, ceo, support_staff | Manage jobs and projects |
| **Maintenance** | admin, ceo, support_staff | Handle maintenance requests |
| **Remote Support** | All authenticated users | Access remote support tools |

## Solution

### Option 1: Apply the Database Migration (Recommended)

A migration has been created to automatically assign the admin role to `craig@zerobitone.co.za`:

**File:** `supabase/migrations/20251112200000_ensure_craig_has_admin_role.sql`

#### For Cloud Deployment (Supabase Cloud):

The migration will be automatically applied when you push your code to the repository connected to your Supabase project.

Alternatively, you can manually run it:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251112200000_ensure_craig_has_admin_role.sql`
4. Paste and execute the SQL
5. Check the output messages to verify success

#### For Local Development:

```bash
# Start local Supabase (if not already running)
npx supabase start

# Reset the database to apply all migrations
npx supabase db reset

# Or apply just the new migration
npx supabase db push
```

### Option 2: Manual Role Assignment via Supabase Dashboard

If you prefer to manually assign the role:

1. **Open Supabase Dashboard**
   - Navigate to your project at [https://supabase.com](https://supabase.com)

2. **Go to Table Editor**
   - Click "Table Editor" in the left sidebar
   - Select the `user_roles` table

3. **Find the User**
   - First, go to the `profiles` table
   - Find the row for `craig@zerobitone.co.za`
   - Copy the `user_id` value (it's a UUID)

4. **Add Admin Role**
   - Go back to the `user_roles` table
   - Click "Insert" → "Insert row"
   - Fill in:
     - `user_id`: Paste the UUID from step 3
     - `role`: Select `admin` from dropdown
   - Click "Save"

5. **Verify**
   - Query the `user_roles` table to confirm the role was added
   - Or use the SQL editor to run:
   ```sql
   SELECT p.email, ur.role
   FROM profiles p
   JOIN user_roles ur ON p.user_id = ur.user_id
   WHERE p.email = 'craig@zerobitone.co.za';
   ```

### Option 3: SQL Query (Advanced)

Run this SQL query in the Supabase SQL Editor:

```sql
-- Assign admin role to craig@zerobitone.co.za
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure they have the default 'user' role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Verification

After applying the fix:

1. **Log out** of the application
2. **Log back in** as `craig@zerobitone.co.za`
3. **Test access** to the following pages:
   - ✅ Reports - Should be accessible
   - ✅ Users (System Users) - Should be accessible
   - ✅ VPN - Should be accessible
   - ✅ RDP - Should be accessible
   - ✅ Jobs - Should be accessible
   - ✅ Maintenance - Should be accessible
   - ✅ Remote Support - Should be accessible

4. **Verify via SQL** (optional):
   ```sql
   SELECT 
     p.email,
     p.full_name,
     ARRAY_AGG(ur.role ORDER BY ur.role) as roles
   FROM profiles p
   LEFT JOIN user_roles ur ON p.user_id = ur.user_id
   WHERE p.email = 'craig@zerobitone.co.za'
   GROUP BY p.email, p.full_name;
   ```
   
   Expected output:
   ```
   email                    | full_name | roles
   -------------------------+-----------+------------------
   craig@zerobitone.co.za  | ...       | {admin, user}
   ```

## Role Hierarchy

For reference, here's the complete role hierarchy in the system:

- **admin** - Full access to everything, including System Users management
- **ceo** - Full access to everything EXCEPT System Users management  
- **support_staff** - Access to most features except Assets and System Users
- **user** - Basic access to Tickets and Remote Support only

All users should have at least the `user` role. Admin users typically have both `admin` and `user` roles.

## Auto-Assignment for Future Accounts

The system is configured to automatically assign the admin role to the following email addresses when they sign up:

- `craig@zerobitone.co.za`
- `admin@oricol.co.za`
- `admin@zerobitone.co.za`

This is handled by the `handle_new_user()` trigger function in the database.

## Troubleshooting

### Still Getting "Access Denied" After Fix

1. **Clear browser cache** and cookies
2. **Log out completely** and log back in
3. **Check browser console** for any JavaScript errors
4. **Verify the role was assigned** using the SQL query above
5. **Check session validity** - Try opening in an incognito/private window

### Cannot See Users Page

The "Users" page is only visible to accounts with the `admin` role. If you can't see it:

1. Verify you have the admin role (use SQL query above)
2. Check if the sidebar component is filtering based on roles
3. Ensure RLS policies are correctly configured

### Changes Not Taking Effect

If you've assigned the role but it's not working:

1. The user session may be cached - **log out and log back in**
2. The migration may not have been applied - verify in Supabase dashboard
3. Check for RLS policy issues - ensure policies allow admins to access the data

## Related Files

- **Migration:** `supabase/migrations/20251112200000_ensure_craig_has_admin_role.sql`
- **Trigger Function:** Defined in `supabase/migrations/20251112172925_add_admin_zerobitone_to_auto_admin.sql`
- **Admin Setup Guide:** `ADMIN_ACCOUNT_SETUP.md`
- **Page Access Checks:**
  - `src/pages/Reports.tsx` (lines 31-53)
  - `src/pages/Users.tsx` (lines 85-107)
  - `src/pages/Vpn.tsx` (lines 86-108)
  - `src/pages/Rdp.tsx` (lines 86-108)
  - `src/pages/Jobs.tsx` (lines 23-45)
  - `src/pages/Maintenance.tsx` (lines 45-67)

## Support

If issues persist after following this guide:

1. Check the Supabase logs for any database errors
2. Review browser console for client-side errors
3. Verify all migrations have been applied successfully
4. Contact the development team with specific error messages

## Prevention

To prevent this issue in the future:

1. Always create admin accounts through the Supabase Dashboard with proper role assignments
2. Use one of the pre-configured admin email addresses that auto-assign roles
3. Verify role assignments immediately after creating new admin accounts
4. Document any manual role assignments made outside of the trigger function
