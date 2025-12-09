# Quick Start: User Sync and Device Tracking

## ⚠️ IMPORTANT: Run This First!

**Before using the system, you MUST run the SQL migration on Supabase:**

1. Open your Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `RUN_THIS_ON_SUPABASE.sql`
3. Paste and click **Run**
4. Wait for success messages

**Why?** This fixes the CEO/CFO role issue that causes the Settings page to be blank.

## 5-Minute Setup Guide

### Step 1: Import Your User List (2 minutes)

1. Prepare a CSV file with your users:
   ```
   email,display_name,vpn_username,rdp_username,job_title
   john@afripipes.co.za,John Doe,jdoe_vpn,jdoe_rdp,Manager
   jane@afripipes.co.za,Jane Smith,jsmith_vpn,jsmith_rdp,Analyst
   ```

2. Go to **User Management** page
3. Click **Import CSV** tab
4. Upload your CSV file
5. Review and confirm import

### Step 2: Sync Devices from Intune (1 minute)

1. Stay on **User Management** page
2. Click **Device Sync** tab
3. Click **Sync Now** button
4. Wait for sync to complete (usually 10-30 seconds)
5. Check the results:
   - ✅ Devices synced
   - ✅ New assignments created
   - ✅ Changes detected

### Step 3: View Your Users (1 minute)

1. Go to **Dashboard**
2. Look at the **Users** tab (admins only)
3. You should now see:
   - All users from your CSV import
   - Their devices (if they have any)
   - VPN/RDP credentials
   - Active/inactive status

### Step 4: Review Device Changes (1 minute)

1. Go to **User Management** → **Change History** tab
2. Review any device changes detected
3. Click **Mark Reviewed** on each change
4. This helps you track device reassignments over time

## Common Scenarios

### Scenario 1: New Employee
**Goal**: Add new employee to system

1. Add row to CSV: `newperson@afripipes.co.za,New Person,newp_vpn,newp_rdp,Role`
2. Import CSV (goes to Master User List tab)
3. Run Device Sync
4. Their device automatically detected from Intune
5. They appear on Dashboard

### Scenario 2: Employee Leaves
**Goal**: Mark employee as inactive

1. Update CSV with their status OR manually in database
2. Re-import CSV (upsert mode - updates existing)
3. Run Device Sync
4. Device reassignment detected if laptop given to someone else
5. Change logged in history

### Scenario 3: Thin Client User (No Physical Device)
**Goal**: Track user who only uses RDP/VPN

1. Add to CSV with VPN/RDP credentials but no device info
2. Import CSV
3. User appears on Dashboard without device badge
4. They can still log in and create tickets
5. Their RDP/VPN info shown in profile

### Scenario 4: Laptop Replaced
**Goal**: Track when employee gets new device

1. Old laptop removed from Intune, new one added
2. Run Device Sync
3. Change detected: "Replacement"
4. Old assignment marked as not current
5. New assignment created
6. Both logged in change history

## What You'll See

### On Dashboard - Users Tab
Each user card shows:
- 👤 Name and email
- 💼 Job title
- 💻 Device count (badge)
- 🔐 VPN count (badge)
- 🖥️ RDP count (badge)
- 📱 Up to 2 devices with serial numbers
- 🔑 Up to 2 VPN usernames
- 🔑 Up to 2 RDP usernames
- ✅ Active/Inactive status

### On User Management - Master User List Tab
- Email address
- Display name
- Active/Inactive badge
- Source: CSV Import / Manual / Intune
- VPN username (if any)
- RDP username (if any)
- Import date

### On User Management - Change History Tab
- 🆕 New Device - Device assigned for first time
- 🔄 Reassignment - Device moved to different user
- 💱 Replacement - User got new device
- 📝 Username Change - RDP/VPN username updated
- ✉️ Email Change - User email updated

## Understanding the System

### Master User List = Source of Truth
- This is THE definitive list of who should be in the system
- Populated from CSV imports or manual entry
- Includes ALL users (with or without devices)
- Dashboard shows users from this list

### Intune = Device Information
- Provides device details (serial numbers, models, names)
- Shows which devices are assigned to which users
- Used to ENRICH the master list, not replace it
- Device assignments automatically tracked

### The Magic: Automatic Sync
- System compares Intune devices with Master User List
- Matches by email address
- Creates device assignment records
- Detects when devices change hands
- Logs everything for audit trail

## Tips & Tricks

### ✅ Do's
- ✅ Keep CSV file updated with current users
- ✅ Run device sync after importing new users
- ✅ Review change history weekly
- ✅ Mark changes as reviewed to keep track
- ✅ Include VPN/RDP usernames in CSV for thin client users

### ❌ Don'ts
- ❌ Don't manually edit device assignments (let sync handle it)
- ❌ Don't delete users from master list (mark inactive instead)
- ❌ Don't use emails outside @afripipes.co.za domain
- ❌ Don't skip reviewing device changes

## Troubleshooting

### "No users found" on Dashboard
**Solution**: Import CSV first, then refresh page

### Settings page is blank
**Solution**: Run `RUN_THIS_ON_SUPABASE.sql` in Supabase SQL Editor

### Device sync shows 0 synced
**Solution**: 
1. Check that master_user_list has data
2. Verify Intune has devices with user assignments
3. Ensure email addresses match between systems

### User imported but not showing
**Solution**:
1. Check email ends with @afripipes.co.za
2. Verify user is marked as active
3. Log out and log back in

### CSV import fails
**Solution**:
1. Ensure CSV has 'email' column
2. Check all emails are valid format
3. Remove special characters from names
4. Save as UTF-8 encoding

## Need More Help?

### Full Documentation
- `USER_LIST_AND_DEVICE_SYNC_GUIDE.md` - Complete technical guide
- `FIX_USER_SYNC_AND_SETTINGS.md` - Detailed fix explanation

### Database Issues
- `RUN_THIS_ON_SUPABASE.sql` - SQL to fix CEO/CFO role issue
- Run in Supabase Dashboard → SQL Editor

### Technical Details
- System uses `master_user_list` as primary source
- Intune data enriches with device information
- All changes logged in `device_change_history`
- Functions: `sync_intune_devices_to_master_users()`

## Quick Commands

### Check Master User List
```sql
SELECT email, display_name, is_active, source 
FROM master_user_list 
ORDER BY display_name;
```

### Run Device Sync (via UI)
User Management → Device Sync → Sync Now

### View Recent Changes
```sql
SELECT * FROM device_change_history 
ORDER BY detected_at DESC 
LIMIT 20;
```

### Find Unassigned Devices
```sql
SELECT * FROM find_unassigned_intune_devices() 
WHERE in_master_list = false;
```

## System Health Check

Run these checks to ensure everything is working:

### ✓ Check 1: Master List Has Users
```sql
SELECT COUNT(*) as active_users FROM master_user_list WHERE is_active = true;
```
**Expected**: > 0

### ✓ Check 2: Device Assignments Exist
```sql
SELECT COUNT(*) as current_assignments FROM device_user_assignments WHERE is_current = true;
```
**Expected**: > 0 (after first sync)

### ✓ Check 3: Intune Has Devices
```sql
SELECT COUNT(*) as intune_devices FROM hardware_inventory WHERE m365_user_email IS NOT NULL;
```
**Expected**: > 0 (if you have Intune devices)

### ✓ Check 4: Roles Are Correct
```sql
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;
```
**Expected**: Should include 'admin', 'ceo', 'cfo', 'support_staff', 'user'

## Next Steps

1. ✅ Run the SQL migration (`RUN_THIS_ON_SUPABASE.sql`)
2. ✅ Import your user CSV
3. ✅ Run device sync
4. ✅ Check Dashboard shows users correctly
5. ✅ Review device changes
6. ✅ Set up regular sync schedule (weekly recommended)

**You're all set! Your user management system is now tracking both Intune users and thin client users with automatic device sync. 🎉**
