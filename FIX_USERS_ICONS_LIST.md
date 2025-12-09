# Fix for Users Icons List Not Displaying on Dashboard

## Problem
After the recent security migration (`20251127135451_970a01d1-c7c5-4c47-851d-9895086ca558.sql`), the RLS policy on the `directory_users` table became too restrictive. It only allows users with 'admin' or 'support_staff' roles to view directory users, which prevents:
1. Admin users from seeing the user icons list on the Dashboard Users tab
2. Regular users from viewing their own profile on the Dashboard My Profile tab

## Solution

### Step 1: Apply the Migration SQL on Supabase

Run the migration file `supabase/migrations/20251209102000_fix_directory_users_rls_for_own_profile.sql` on your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20251209102000_fix_directory_users_rls_for_own_profile.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute

**Option B: Using Supabase CLI**
```bash
npx supabase migration up
```

### Step 2: Verify the Fix

After applying the migration:
1. Log in as an admin user
2. Navigate to the Dashboard
3. Click on the "Users" tab
4. You should now see the user icons list with all directory users

For regular users:
1. Log in as a regular (non-admin) user
2. Navigate to the Dashboard
3. You should see the "My Profile" tab with your user information

## What the Migration Does

The migration creates two RLS policies on the `directory_users` table:

1. **"Staff can view all directory users"** - Allows admin and support_staff roles to view all directory users
2. **"Users can view own directory user by email"** - Allows regular users to view their own directory_user record by matching their email from the profiles table

This maintains security while enabling the Dashboard functionality for all users.

## Next Steps: CSV-Based User Management

See `CSV_USER_MANAGEMENT_PLAN.md` for the plan to implement the new architecture where the user list is managed via CSV imports from RDP/VPN spreadsheets instead of being dynamically pulled from Intune.
