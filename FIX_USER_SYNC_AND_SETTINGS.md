# Fix for User Sync and Settings Page Issues

## Issues Fixed

### Issue 1: Dashboard User Sync
**Problem:** The Dashboard was only showing users synced from Microsoft 365/Intune (`directory_users` table) and ignoring users imported from RDP/VPN CSV files (`master_user_list` table).

**Solution:** Updated the Dashboard to query and merge users from BOTH sources:
- `directory_users` - Microsoft 365/Intune synced users
- `master_user_list` - CSV imported users with RDP/VPN credentials

Users from both sources are now displayed, with deduplication by email (Intune users take priority).

### Issue 2: Settings Page Blank (CEO/CFO Role Problem)
**Problem:** The database migrations referenced CEO and CFO roles (`'ceo'::app_role`, `'cfo'::app_role`) but these values were never properly added to the `app_role` enum. This caused database query failures.

**Solution:** Created migration to add both `ceo` and `cfo` roles to the enum safely.

## Required Manual Steps on Supabase

**YES - You MUST run the migration on Supabase to fix the Settings page and CEO/CFO role issues.**

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire contents of this file:
   ```
   supabase/migrations/20251209111500_add_ceo_cfo_roles_to_enum.sql
   ```
6. Click **Run** or press `Ctrl+Enter`
7. You should see success messages:
   - "Added ceo role to app_role enum" (or "already exists")
   - "Added cfo role to app_role enum" (or "already exists")
   - "app_role enum verification: PASSED"

### Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked:

```bash
npm run migrate:apply
```

## Changes Made

### 1. Database Migration (`supabase/migrations/20251209111500_add_ceo_cfo_roles_to_enum.sql`)
- Adds `ceo` role to `app_role` enum (if not exists)
- Adds `cfo` role to `app_role` enum (if not exists)
- Updates enum documentation
- Verifies all required roles are present
- **IDEMPOTENT**: Safe to run multiple times

### 2. Dashboard Component (`src/pages/Dashboard.tsx`)
- Modified `fetchDirectoryUsers()` to query BOTH:
  - `directory_users` table (Intune/M365)
  - `master_user_list` table (CSV imports)
- Merges users with deduplication by email
- Intune users take priority over CSV imported users
- Updated `enrichUsersWithStats()` to also pull VPN/RDP credentials from `master_user_list`
- Changed error message from "No users synced from Intune yet" to more accurate message

## Verification Steps

### 1. Verify Settings Page
1. Log in to your application
2. Navigate to **Settings** page
3. Page should load without errors
4. All three tabs should be accessible:
   - Theme & Appearance
   - IT Suppliers Style
   - Connection Status

### 2. Verify Dashboard Users
1. Navigate to **Dashboard**
2. If you're an admin, you should see the "Users" tab
3. Users should now include:
   - Users synced from Microsoft 365/Intune
   - Users imported from RDP/VPN CSV files
4. No duplicate users should appear (deduplication by email)
5. VPN and RDP credentials should be displayed for users who have them

### 3. Verify User Data
Check that the following are displayed for each user:
- Display name and email
- Job title (if available)
- Device count badge (if they have devices)
- VPN count badge (if they have VPN credentials)
- RDP count badge (if they have RDP credentials)
- Device details (serial numbers, models)
- VPN usernames
- RDP usernames

## Technical Details

### app_role Enum Values (After Migration)
- `admin` - Full system access including user management
- `ceo` - View access to most features, limited edit access, cannot manage system users
- `cfo` - Similar to CEO, view access with limited edit capabilities
- `support_staff` - Can manage tickets, view users, limited administrative access
- `user` - Basic access to own tickets and profile

### User Data Sources Priority
1. **directory_users** (highest priority) - Microsoft 365/Intune sync
2. **master_user_list** (lower priority) - CSV imports

If a user exists in both tables with the same email, the Intune version is used, but credentials from both sources are merged.

### Credential Aggregation
VPN and RDP credentials are collected from:
1. `vpn_rdp_credentials` table - Individual credential records
2. `master_user_list` table - Credentials from CSV imports (vpn_username, rdp_username columns)

All credentials are deduplicated to avoid showing the same username multiple times.

## Troubleshooting

### Settings page still blank after migration
1. Check browser console for errors
2. Verify the migration ran successfully:
   ```sql
   SELECT enumlabel 
   FROM pg_enum e
   JOIN pg_type t ON e.enumtypid = t.oid
   WHERE t.typname = 'app_role'
   ORDER BY e.enumsortorder;
   ```
   Should return: admin, support_staff, user, ceo, cfo

### No users showing on Dashboard
1. Check if you have data in either table:
   ```sql
   SELECT COUNT(*) FROM directory_users;
   SELECT COUNT(*) FROM master_user_list WHERE is_active = true;
   ```
2. Verify you're logged in as an admin user
3. Check browser console for errors

### Users showing but no VPN/RDP credentials
1. Check if credentials exist:
   ```sql
   SELECT * FROM vpn_rdp_credentials LIMIT 5;
   SELECT email, vpn_username, rdp_username FROM master_user_list WHERE vpn_username IS NOT NULL OR rdp_username IS NOT NULL LIMIT 5;
   ```
2. Verify user emails match between tables (case-insensitive matching is used)

## Additional Notes

- The migration is **idempotent** - it's safe to run multiple times
- Existing CEO/CFO role assignments in `user_roles` table will work after the migration
- No data is deleted or modified, only the enum is extended
- The fix maintains backward compatibility with existing code
