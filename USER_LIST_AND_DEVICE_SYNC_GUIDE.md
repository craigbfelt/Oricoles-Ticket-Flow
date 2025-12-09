# User List and Device Sync System - Complete Guide

## Overview

This system implements a **fixed master user list** as the source of truth for user management, with automatic device sync from Microsoft 365 Intune. It tracks device assignments, detects changes, and manages users with or without physical devices (e.g., thin client users).

## Key Concepts

### 1. Master User List (Source of Truth)
The `master_user_list` table is the **primary source** of who should be in the system:
- Populated via CSV import (from RDP/VPN spreadsheets)
- Can also be manually added via UI
- Includes users with devices AND thin client users without devices
- Contains VPN/RDP usernames for authentication tracking

### 2. Intune Device Sync
Microsoft 365 Intune provides device data:
- Device serial numbers, models, and names
- Current device assignments (which user has which device)
- Account enabled/disabled status
- User principal names (UPNs)

### 3. Device Assignment Tracking
The system automatically tracks device assignments:
- Compares Intune data with master user list
- Creates assignment records in `device_user_assignments`
- Detects when devices are reassigned to different users
- Logs all changes in `device_change_history`

### 4. Thin Client Users
Users who connect via RDP/VPN without physical devices:
- Listed in master user list with RDP/VPN credentials
- Won't appear in Intune device list
- Still tracked and managed in the system
- Can log tickets and access their profile

## Database Tables

### Core Tables

#### `master_user_list`
**The source of truth for users**
- `email` - User email (unique identifier)
- `display_name` - Full name
- `job_title`, `department` - Job information
- `vpn_username`, `rdp_username` - Access credentials
- `is_active` - Whether user is active
- `source` - 'csv_import', 'manual', or 'intune'

#### `device_user_assignments`
**Tracks which devices are assigned to which users**
- `device_serial_number` - Device identifier
- `user_email` - Owner's email
- `device_name`, `device_model` - Device details
- `is_current` - Whether this is the current assignment
- `assignment_source` - 'auto', 'manual', or 'intune_sync'

#### `device_change_history`
**Audit log of device changes**
- `device_serial_number` - Device that changed
- `change_type` - 'new_device', 'reassignment', 'replacement', etc.
- `old_user_email`, `new_user_email` - Change details
- `reviewed` - Whether change has been reviewed by admin

#### `manual_devices`
**Non-Intune devices (thin clients, etc.)**
- `device_serial_number` - Device identifier
- `device_type` - 'thin_client', 'desktop', 'laptop', etc.
- `assigned_user_email` - Owner
- `connection_type` - 'rdp', 'vpn', 'direct'

### Supporting Tables

- `directory_users` - Intune/M365 user sync data (enrichment)
- `hardware_inventory` - Complete Intune device inventory
- `vpn_rdp_credentials` - Individual VPN/RDP credential records
- `profiles` - System user profiles (staff with login access)

## User Workflow

### Initial Setup

1. **Import Master User List**
   - Go to **User Management** page
   - Click **Import CSV** tab
   - Upload CSV with user data (email, name, VPN/RDP usernames)
   - Users are added to `master_user_list`

2. **Sync Devices from Intune**
   - Go to **User Management** → **Device Sync** tab
   - Click **Sync Now**
   - System matches Intune devices to users in master list
   - Creates device assignments and detects changes

3. **Review Changes**
   - Go to **User Management** → **Change History** tab
   - Review any device reassignments or new devices
   - Mark changes as reviewed

### Ongoing Operations

#### When a New Employee Joins
1. Add user to master list via CSV import or manual entry
2. Run device sync to detect their device from Intune
3. User appears on Dashboard with device info

#### When an Employee Leaves
1. Update user as inactive in master list
2. Device reassignment will be detected on next sync
3. Change logged in history

#### When a Device is Replaced
1. New device appears in Intune with same user
2. Device sync detects replacement
3. Logged as 'replacement' in change history
4. Old assignment marked as not current

#### For Thin Client Users
1. Import user with RDP/VPN credentials but no device
2. User appears on Dashboard without device badge
3. Can still log tickets and access system
4. RDP/VPN credentials shown in their profile

## Dashboard Display Logic

### User Data Priority
The Dashboard combines data from multiple sources with this priority:

1. **Master User List** (Primary)
   - Email, display name, job title
   - VPN/RDP usernames
   - Active status

2. **Directory Users** (Enrichment)
   - Account enabled/disabled status
   - User Principal Name (UPN)
   - Additional job info if missing

3. **Device Assignments** (Current)
   - Tracked device assignments
   - Shows currently assigned devices

4. **Hardware Inventory** (Fallback)
   - New devices not yet synced
   - Provides device details

### Display Rules
- Users in master list are ALWAYS shown (even without devices)
- Device information added if available
- VPN/RDP credentials shown if present
- Thin client users shown without device badges
- Inactive users filtered out by default

## Device Sync Function

### What It Does
The `sync_intune_devices_to_master_users()` function:

1. Loops through all Intune devices with user assignments
2. Finds corresponding user in master list by email
3. Checks if device already has an assignment record
4. Detects changes:
   - **New device**: Device assigned to user for first time
   - **Reassignment**: Device moved from one user to another
   - **Update**: Device details changed (name, model)
5. Creates/updates assignment records
6. Logs changes in history table

### When to Run
- **After CSV import** - Match imported users with their Intune devices
- **Daily** - Scheduled job to detect device changes
- **On demand** - When investigating device assignments
- **After Intune sync** - When M365 data is refreshed

### Return Values
```json
{
  "synced_count": 45,      // Devices processed
  "new_assignments": 3,    // New device-user links created
  "changes_detected": 2,   // Reassignments found
  "errors_count": 0        // Errors during sync
}
```

## CSV Import Format

### Required Columns
- `email` - User email address (must end with @afripipes.co.za)

### Optional Columns
- `display_name` - Full name
- `job_title` - Job title
- `department` - Department name
- `vpn_username` - VPN access username
- `rdp_username` - RDP access username
- `branch` - Branch name or code
- `notes` - Additional notes

### Example CSV
```csv
email,display_name,job_title,department,vpn_username,rdp_username,notes
john.doe@afripipes.co.za,John Doe,Manager,IT,jdoe_vpn,jdoe_rdp,Main office
jane.smith@afripipes.co.za,Jane Smith,Analyst,Finance,jsmith_vpn,,Thin client user
```

### Validation Rules
- Email is required and must be valid format
- Email must end with @afripipes.co.za
- Duplicate emails are updated (upsert behavior)
- Invalid emails are rejected with error message

## Change Types

### new_device
A device appears in Intune assigned to a user who didn't have it before.

**Example**: New employee's laptop shows up in Intune.

### reassignment
A device is moved from one user to another.

**Example**: Laptop previously assigned to User A now assigned to User B.

### replacement
A user gets a new device while old device becomes unassigned.

**Example**: Employee gets new laptop, old laptop unassigned.

### username_change
A user's RDP or VPN username changed in the master list.

**Example**: Username updated during CSV import.

### email_change
A user's email address changed (rare, usually indicates account migration).

## User Interface

### User Management Page

#### Import CSV Tab
- Upload CSV file with user data
- Validates data before import
- Shows preview of users to be imported
- Displays validation errors clearly
- Confirms successful import

#### Master User List Tab
- Shows all users in master list
- Displays active/inactive status
- Shows source (CSV, manual, Intune)
- Indicates VPN/RDP username presence
- Click user to view full details

#### Device Sync Tab
- Big "Sync Now" button
- Shows last sync results:
  - Devices synced
  - New assignments
  - Changes detected
  - Errors encountered
- Explains what sync does
- Shows sync timestamp

#### Change History Tab
- Lists all device changes
- Filter: All / Unreviewed
- Shows change type with icon
- Displays old → new user for reassignments
- Mark changes as reviewed
- Shows review status and timestamp

### Dashboard Users Tab

For each user, displays:
- Display name and email
- Job title (if available)
- Active/inactive status badge
- Staff user indicator (if they have login access)
- Device count badge
- VPN credential count badge
- RDP credential count badge
- Up to 2 device details (serial, model, name)
- Up to 2 VPN usernames
- Up to 2 RDP usernames
- "+X more" indicator if more items exist

## Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled:
- Admins can view/edit all data
- Support staff can view most data
- Regular users can only view their own data
- CEO/CFO roles have appropriate access

### Function Security
Database functions use `SECURITY DEFINER`:
- Execute with elevated privileges
- Check caller's role before allowing operations
- Log all changes with user ID

### Data Privacy
- Passwords are NOT stored in master list
- Only usernames are tracked
- Actual credentials managed separately
- Device sync only tracks assignments, not device contents

## Troubleshooting

### Users Not Showing on Dashboard

**Problem**: Dashboard shows "No users found"

**Solutions**:
1. Check if master_user_list has data:
   ```sql
   SELECT COUNT(*) FROM master_user_list WHERE is_active = true;
   ```
2. Ensure emails end with @afripipes.co.za
3. Verify you're logged in as admin

### Device Sync Not Detecting Changes

**Problem**: Sync completes but no changes detected

**Solutions**:
1. Verify users exist in master_user_list
2. Check Intune devices have m365_user_email set:
   ```sql
   SELECT * FROM hardware_inventory 
   WHERE m365_user_email IS NULL 
   LIMIT 10;
   ```
3. Ensure user emails in Intune match master list exactly

### CSV Import Fails

**Problem**: CSV validation errors

**Solutions**:
1. Ensure email column exists and has values
2. Check all emails end with @afripipes.co.za
3. Verify CSV is properly formatted (UTF-8, comma-delimited)
4. Check for special characters in names

### Settings Page Blank

**Problem**: Settings page doesn't load

**Solution**:
1. Run the SQL migration to fix CEO/CFO roles:
   ```bash
   # See RUN_THIS_ON_SUPABASE.sql
   ```
2. Clear browser cache
3. Check browser console for errors

## API Reference

### Database Functions

#### `sync_intune_devices_to_master_users()`
Syncs Intune devices with master user list.

**Returns**: Table with sync results
- `synced_count` INTEGER
- `new_assignments` INTEGER  
- `changes_detected` INTEGER
- `errors_count` INTEGER

**Usage**:
```sql
SELECT * FROM sync_intune_devices_to_master_users();
```

#### `get_user_summary(p_user_email TEXT)`
Gets comprehensive user information.

**Parameters**:
- `p_user_email` - User's email address

**Returns**: Table with JSON objects
- `user_data` JSONB - Master list data
- `devices` JSONB - Array of device assignments
- `vpn_credentials` JSONB - Array of VPN accounts
- `rdp_credentials` JSONB - Array of RDP accounts
- `device_changes` JSONB - Array of device change history
- `intune_user` JSONB - Intune user data

**Usage**:
```sql
SELECT * FROM get_user_summary('john.doe@afripipes.co.za');
```

#### `find_unassigned_intune_devices()`
Finds devices in Intune not assigned to users in master list.

**Returns**: Table
- `serial_number` TEXT
- `device_name` TEXT
- `model` TEXT
- `m365_user_principal_name` TEXT
- `m365_user_email` TEXT
- `in_master_list` BOOLEAN

**Usage**:
```sql
SELECT * FROM find_unassigned_intune_devices() 
WHERE in_master_list = false;
```

## Best Practices

### Regular Maintenance
1. **Weekly**: Review unreviewed device changes
2. **Monthly**: Verify master list is up to date
3. **Quarterly**: Check for unassigned Intune devices
4. **After HR changes**: Update master list and run sync

### Data Quality
1. Keep master list current with HR records
2. Use consistent email formats
3. Update VPN/RDP usernames when changed
4. Mark inactive users promptly

### Performance
1. Limit dashboard queries to active users
2. Run device sync during off-peak hours if dataset is large
3. Use pagination when displaying large user lists
4. Archive old device change history periodically

### Monitoring
1. Check sync results regularly
2. Investigate high error counts
3. Review device changes for suspicious activity
4. Monitor for devices assigned to non-existent users

## Future Enhancements

### Planned Features
- [ ] Automated scheduled device sync
- [ ] Email notifications for device changes
- [ ] Bulk user operations (activate/deactivate)
- [ ] Export device assignment reports
- [ ] Integration with HR systems
- [ ] Device lifecycle tracking
- [ ] Automated thin client device detection

### Under Consideration
- [ ] Mobile app for viewing assignments
- [ ] Slack/Teams notifications for changes
- [ ] Dashboard widgets for quick stats
- [ ] Advanced search and filtering
- [ ] Custom fields for user metadata
