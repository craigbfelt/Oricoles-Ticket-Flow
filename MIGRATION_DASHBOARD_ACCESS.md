# Migration Dashboard Access Guide

## Overview

This guide explains how to access and use the migration pages that are now available on the Dashboard.

## What Was Fixed

### 1. Migration Cards Added to Dashboard

Two new navigation cards have been added to the Dashboard for admin users:

1. **Migrations** - Access database migration management
   - Icon: Code (purple background)
   - Route: `/migrations`
   - Required Role: Admin only

2. **Migration Tracker** - Track migration status and changes
   - Icon: GitBranch (teal background)
   - Route: `/migration-tracker`
   - Required Role: Admin only

### 2. All SQL Migration Files Are Available

All 89 migration SQL files in the `supabase/migrations` folder are automatically loaded and displayed in the Migrations page, including:

- **20251209111600_create_device_sync_functions.sql** - Device sync functions for User Management
- All other database migrations

## How to Access Migrations

### Step 1: Log in as Admin

Only users with the `admin` role can access the migration pages.

### Step 2: Navigate to Dashboard

Go to the main Dashboard page after logging in.

### Step 3: Find the Migration Cards

In the "Quick Navigation" section, look for two new cards:

- **Migrations** (purple/violet card with Code icon)
- **Migration Tracker** (teal card with GitBranch icon)

### Step 4: Click to Access

Click on either card to navigate to the respective page.

## Using the Migrations Page

### Features Available

1. **View All Migrations**
   - See all 89 SQL migration files
   - Organized chronologically by timestamp
   - Filter by: Unapplied, Applied, or All

2. **View SQL Content**
   - Click "View SQL" button on any migration
   - Full SQL code is displayed in a dialog
   - Copy SQL to clipboard with one click

3. **Mark Migrations as Applied**
   - After manually running SQL in Supabase
   - Click "Mark as Applied" to record the migration
   - Or select multiple and use "Mark X as Applied"

4. **Quick Access to Supabase SQL Editor**
   - "Open Backend SQL Editor" button
   - Automatically opens your Supabase project's SQL editor
   - Ready to paste and run migration SQL

### Accessing Device Sync Migration

To find the device sync migration SQL:

1. Go to Dashboard → **Migrations** card
2. Look for migration: `20251209111600_create_device_sync_functions.sql`
3. Click **View SQL** button
4. The full SQL code will be displayed
5. Click **Copy SQL** to copy to clipboard
6. Click **Open Backend SQL Editor** to run it in Supabase

## Running Migrations on Supabase

### Option 1: Via Migrations Page (Recommended)

1. **Navigate to Migrations**
   ```
   Dashboard → Migrations card → Click migration → View SQL
   ```

2. **Copy the SQL**
   - Click "Copy SQL" button
   - Or manually select and copy

3. **Open Supabase SQL Editor**
   - Click "Open Backend SQL Editor" button
   - Or manually go to: https://supabase.com/dashboard → Your Project → SQL Editor

4. **Paste and Run**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for success message

5. **Mark as Applied**
   - Return to Migrations page
   - Click "Mark as Applied" for that migration
   - Or use bulk "Mark X as Applied" button

### Option 2: Direct Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project (e.g., oricoles's Project)
3. Navigate to **SQL Editor** in left sidebar
4. Open this repository in GitHub
5. Navigate to `supabase/migrations/` folder
6. Open the migration file you need
7. Copy the contents
8. Paste into Supabase SQL Editor
9. Click **Run**

### Option 3: Using Supabase CLI

If you have Supabase CLI installed locally:

```bash
# Navigate to project directory
cd /path/to/Oricoles-Ticket-Flow

# Link to your Supabase project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
npx supabase db push
```

## Migration Status Tracking

The system tracks which migrations have been applied in the `schema_migrations` table:

- **Applied migrations** - Shown with green checkmark badge
- **Pending migrations** - Shown with yellow warning badge
- **Progress bar** - Shows overall completion percentage

### Checking Status

1. Go to Dashboard → Migrations
2. View the summary cards at the top:
   - Total Migrations
   - Applied (green count)
   - Pending (yellow count)
3. Progress bar shows percentage complete

## Troubleshooting

### Migration Cards Not Showing

**Problem**: Can't see Migrations or Migration Tracker cards on Dashboard

**Solutions**:
1. Verify you're logged in as an **admin** user
2. Check your user role in the database:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
   ```
3. Ensure role is set to 'admin'
4. Log out and log back in to refresh roles

### SQL Files Not Showing

**Problem**: Migrations page shows "No migrations found"

**Solutions**:
1. Verify files exist in `supabase/migrations/` folder
2. Check build was successful (files loaded at build time)
3. Clear browser cache and refresh
4. Redeploy the application

### Device Sync Migration Not Found

**Problem**: Can't find the device sync migration file

**Solution**: The file is located at:
```
supabase/migrations/20251209111600_create_device_sync_functions.sql
```

To access it:
1. Dashboard → Migrations card
2. Scroll to or search for migration starting with `20251209111600`
3. Full name: `create_device_sync_functions.sql`
4. Click "View SQL" to see the full content

### "Mark as Applied" Fails

**Problem**: Error when marking migration as applied

**Solutions**:
1. Check if Edge Function is deployed (see error message)
2. If Edge Function not available, manually insert into database:
   ```sql
   INSERT INTO public.schema_migrations (version, applied_at) 
   VALUES ('20251209111600_create_device_sync_functions', NOW()) 
   ON CONFLICT (version) DO NOTHING;
   ```
3. The Migrations page provides this SQL command in error messages

## Migration Organization

Migrations are organized by timestamp in the filename:

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20251209111600_create_device_sync_functions.sql`
- Date: 2025-12-09
- Time: 11:16:00
- Description: create_device_sync_functions

This ensures migrations run in chronological order.

## Key Migrations for User Management

### Device Sync Migration
- **File**: `20251209111600_create_device_sync_functions.sql`
- **Purpose**: Creates functions for syncing Intune devices with master user list
- **Required For**: User Management → Device Sync feature
- **What It Does**:
  - Creates `sync_intune_devices_to_master_users()` function
  - Enables automatic device assignment tracking
  - Detects device changes and reassignments
  - Logs changes in device_change_history table

### User Management Setup
1. `20251209103000_create_csv_user_management_schema.sql` - Creates master_user_list table
2. `20251209111600_create_device_sync_functions.sql` - Creates sync functions
3. Related migrations for device tracking and assignments

## Best Practices

### Before Running Migrations

1. **Backup your database**
   - Use Supabase dashboard backup feature
   - Or export tables manually

2. **Review the SQL**
   - Click "View SQL" and read the code
   - Understand what changes will be made
   - Check for dependencies on other migrations

3. **Check prerequisites**
   - Ensure earlier migrations are applied first
   - Verify required tables exist

### After Running Migrations

1. **Mark as Applied**
   - Record the migration in the system
   - Keeps tracking accurate

2. **Test the feature**
   - Verify the migration worked correctly
   - Check for errors in Supabase logs
   - Test related functionality

3. **Review changes**
   - Check that tables were created
   - Verify functions exist and work
   - Test RLS policies if applicable

## Support

### Getting Help

1. **Check error messages** - The Migrations page provides detailed error messages
2. **Review Supabase logs** - Check your project's logs in Supabase dashboard
3. **Check browser console** - Press F12 to see client-side errors
4. **Verify database state** - Query tables and functions to verify state

### Common Issues

| Issue | Solution |
|-------|----------|
| Edge Function not deployed | Use manual SQL insert (provided in error message) |
| Migration fails to run | Check Supabase logs for SQL errors |
| Function already exists | Migration may already be applied, verify in database |
| Permission denied | Ensure you're running as database admin/owner |
| Table not found | Check if prerequisite migrations are applied |

## Summary

- ✅ Migration cards now visible on Dashboard for admin users
- ✅ All 89 migration SQL files accessible in Migrations page
- ✅ Device sync migration (20251209111600) is available
- ✅ Full SQL content viewable and copyable
- ✅ Direct link to Supabase SQL Editor
- ✅ Migration status tracking with progress bar
- ✅ Bulk operations for marking multiple migrations as applied

## Next Steps

1. **Access the Migrations page** from Dashboard
2. **Review pending migrations** in the Unapplied tab
3. **Run the device sync migration** if needed for User Management
4. **Mark migrations as applied** after running them
5. **Monitor progress** with the tracking features

---

**Updated**: December 15, 2024
**Fix Applied**: Migration dashboard cards now visible
**Files Modified**: `src/pages/Dashboard.tsx`
