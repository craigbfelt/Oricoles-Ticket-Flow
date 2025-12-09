# Action Items Required - User Icons List Fix

## IMMEDIATE ACTIONS NEEDED

### 1. Fix Users Icons List Not Displaying (CRITICAL - Do This First!)

**Problem**: Users icons list is not visible on the Dashboard after recent security changes.

**Solution**: Run the RLS fix migration on your Supabase database.

#### Steps:
1. Go to your Supabase project dashboard at https://supabase.com
2. Navigate to the **SQL Editor** (left sidebar)
3. Copy the contents of this file: `supabase/migrations/20251209102000_fix_directory_users_rls_for_own_profile.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute

#### What this does:
- Allows admin users to see all users on the Dashboard Users tab
- Allows regular users to see their own profile on the Dashboard My Profile tab
- Maintains security while fixing the access issue

#### Verification:
After running the migration:
- Log in as an admin → Go to Dashboard → Click "Users" tab → You should see user icons
- Log in as a regular user → Go to Dashboard → You should see "My Profile" tab with your info

---

### 2. Enable CSV-Based User Management (NEW ARCHITECTURE)

**Purpose**: Transition from dynamic Intune sync to a fixed user list managed via CSV imports.

#### Steps:
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Copy the contents of this file: `supabase/migrations/20251209103000_create_csv_user_management_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute

#### What this does:
Creates 4 new tables:
- **master_user_list** - Stores users imported from CSV files (RDP/VPN spreadsheets)
- **device_user_assignments** - Tracks which devices are assigned to which users (by serial number)
- **device_change_history** - Logs detected changes in device assignments
- **manual_devices** - For thin clients and devices not in Intune

---

## NEXT STEPS (After Running Migrations)

### Phase 1: Prepare Your CSV Files

The system will support importing user data from CSV files. Prepare your CSV files in one of these formats:

#### Option A: Combined RDP/VPN Users CSV
```csv
email,display_name,vpn_username,rdp_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_vpn,jdoe_rdp,Manager,IT,Head Office,
```

#### Option B: Separate RDP Users CSV
```csv
email,display_name,rdp_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_rdp,Manager,IT,Head Office,
```

#### Option C: Separate VPN Users CSV
```csv
email,display_name,vpn_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_vpn,Manager,IT,Head Office,
```

**Note**: The CSV import UI will be created in the next phase. For now, just prepare your CSV files.

---

## CURRENT STATUS

### ✅ Completed:
- [x] Identified root cause of users icons list issue (RLS policy too restrictive)
- [x] Created RLS fix migration
- [x] Designed new CSV-based user management architecture
- [x] Created database schema for new system
- [x] Created comprehensive implementation plan

### ⏳ In Progress:
- [ ] CSV import UI (will be created next)
- [ ] Device serial number matching logic
- [ ] Dashboard integration with new tables
- [ ] Manual device entry UI

### 📋 Pending:
- [ ] User to run both migration SQL files on Supabase
- [ ] User to prepare CSV files with current RDP/VPN user lists
- [ ] Testing of the new system
- [ ] M365 full sync to update device serial numbers

---

## IMPORTANT NOTES

### About Microsoft 365 Sync
- You mentioned needing to do a M365 full sync to bring the user list
- **For now**, run the RLS fix migration first so the current system works
- The M365 sync will continue to populate `hardware_inventory` with device data
- Once the CSV import UI is ready, you can import your static user list
- The system will then match devices (by serial number) to your imported users

### About Device Serial Numbers
- The new system uses device serial numbers as unique identifiers
- Ensure all devices in Intune have accurate serial numbers
- After M365 sync, the `hardware_inventory` table will have up-to-date serial numbers
- The device matching logic will compare these with your imported user assignments

### About Thin Clients
- Thin clients that connect directly to RDP won't appear in Intune
- After the manual device UI is created, you can add these manually
- Each manual device entry will require: serial number, device name, assigned user, connection type

---

## TROUBLESHOOTING

### If users icons still don't show after running migration:
1. Check that the migration ran successfully (no errors in SQL Editor)
2. Verify you're logged in as a user with appropriate role:
   - Admin role → should see "Users" tab
   - Regular user → should see "My Profile" tab
3. Check browser console for errors (F12 → Console tab)
4. Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)

### If you get RLS policy errors:
- Ensure the user account has a role in the `user_roles` table
- Admin accounts should have `role = 'admin'` in `user_roles`
- Regular users should have a record in `profiles` table with their email

---

## DOCUMENTATION REFERENCES

- **FIX_USERS_ICONS_LIST.md** - Detailed explanation of the RLS fix
- **CSV_USER_MANAGEMENT_PLAN.md** - Complete implementation plan for CSV-based system
- **Migration files**:
  - `supabase/migrations/20251209102000_fix_directory_users_rls_for_own_profile.sql`
  - `supabase/migrations/20251209103000_create_csv_user_management_schema.sql`

---

## QUESTIONS?

If you encounter any issues or need clarification on any of these steps, please let me know and I'll assist further.
