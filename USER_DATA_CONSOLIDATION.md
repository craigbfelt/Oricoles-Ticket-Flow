# User Data Consolidation - Dashboard Integration

## Overview

The Users Dashboard consolidates user information from multiple database tables to provide a unified view of each user's branch details, credentials, and device assignments.

## Data Sources

### 1. Master User List (`master_user_list` table)
**Purpose**: Single source of truth for user list
- Contains the authoritative list of active users
- Populated via CSV imports from the Master User Data page
- Stores user credentials (VPN/RDP usernames)
- Links to branch via `branch_id` foreign key

**Fields Used**:
- `id` - Unique identifier
- `display_name` - User's display name
- `email` - User email (primary key for matching)
- `job_title` - User job title
- `department` - Department/division
- `branch_id` - Foreign key to branches table
- `vpn_username` - VPN credential username
- `rdp_username` - RDP credential username
- `is_active` - Whether user is active

### 2. Branches (`branches` table)
**Purpose**: Branch location information
- Stores branch names and details
- Joined via `master_user_list.branch_id`

**Fields Used**:
- `id` - Unique identifier
- `name` - Branch name displayed on user cards

### 3. VPN/RDP Credentials (`vpn_rdp_credentials` table)
**Purpose**: Detailed credential information
- Stores credentials imported from VPN/RDP CSV files
- Contains passwords (not shown on cards, only in details dialog)
- Service type differentiated by `service_type` column

**Fields Used**:
- `email` - Links to user
- `username` - Credential username
- `password` - Credential password
- `service_type` - Either 'VPN' or 'RDP'
- `notes` - Additional credential notes

### 4. Device Assignments (`device_user_assignments` table)
**Purpose**: Current device assignments
- Tracks which devices are assigned to which users
- Includes both Intune-synced and manually added devices
- Filtered by `is_current = true`

**Fields Used**:
- `user_email` - Links to user
- `device_serial_number` - Device serial
- `device_name` - Device name
- `device_model` - Device model
- `is_current` - Whether assignment is active

### 5. Hardware Inventory (`hardware_inventory` table)
**Purpose**: Device details from Intune/M365
- Contains detailed device information from M365 sync
- Provides additional device metadata

**Fields Used**:
- `m365_user_email` - User email
- `m365_user_principal_name` - User UPN
- `serial_number` - Device serial
- `model` - Device model
- `device_name` - Device name
- `device_type` - Type of device

### 6. Directory Users (`directory_users` table)
**Purpose**: Microsoft 365 / Intune enrichment
- Synced from M365/Intune
- Provides account status and UPN
- Used to enrich data when master_user_list is incomplete

**Fields Used**:
- `email` - User email
- `display_name` - Display name from M365
- `user_principal_name` - UPN from M365
- `job_title` - Job title from M365
- `account_enabled` - Whether M365 account is active

### 7. Profiles (`profiles` table)
**Purpose**: System user identification
- Identifies which users are staff (can log into the system)
- Used to add staff badge on user cards

**Fields Used**:
- `email` - User email for matching

## Data Flow

### Step 1: Fetch Base User List
**Function**: `fetchDirectoryUsers()`
**Source**: `master_user_list` table with JOIN to `branches`

```sql
SELECT 
  id, display_name, email, job_title, department, 
  vpn_username, rdp_username, is_active, source, 
  branch_id, 
  branches.name as branch_name
FROM master_user_list
JOIN branches ON master_user_list.branch_id = branches.id
WHERE is_active = true
ORDER BY display_name
```

**Output**: List of active users with branch names

### Step 2: Enrich with M365 Data
**Function**: `fetchDirectoryUsers()`
**Source**: `directory_users` table

- Fetches M365/Intune data for additional enrichment
- Maps by email address
- Supplements missing fields from master_user_list
- Provides `account_enabled` status

### Step 3: Consolidate Credentials and Devices
**Function**: `enrichUsersWithStats()`
**Sources**: Multiple tables

#### 3a. VPN Credentials
**Sources**: 
1. `vpn_rdp_credentials` WHERE `service_type = 'VPN'`
2. `master_user_list.vpn_username`

**Deduplication**: By `username` to avoid duplicates

#### 3b. RDP Credentials
**Sources**: 
1. `vpn_rdp_credentials` WHERE `service_type = 'RDP'`
2. `master_user_list.rdp_username`

**Deduplication**: By `username` to avoid duplicates

#### 3c. Device Information
**Sources**:
1. `device_user_assignments` WHERE `is_current = true`
2. `hardware_inventory` (for devices not yet in assignments)

**Deduplication**: By `serial_number` to avoid duplicates

#### 3d. Staff User Status
**Source**: `profiles` table
- Checks if user email exists in profiles
- Adds staff badge indicator

### Step 4: Display on User Cards

User cards display consolidated information:
- **Display Name**: From master_user_list or directory_users
- **Email**: From master_user_list
- **Job Title**: From master_user_list or directory_users
- **Branch Name**: From branches JOIN (displays "NA" if not set)
- **VPN Count**: Number of VPN credentials (badge)
- **RDP Count**: Number of RDP credentials (badge)
- **Device Count**: Number of assigned devices (badge)
- **Device Type**: Thin Client or Full PC (determined by device/credential presence)
- **Account Status**: Active or Disabled (from directory_users)
- **Staff Badge**: If user is in profiles table

## Deduplication Strategy

### Users
- **Key**: Email address (case-insensitive)
- **Logic**: Full email used to ensure uniqueness
- Prevents duplicate cards for same user

### Credentials
- **Key**: `username + service_type`
- **Logic**: Checks if username already exists in credential list
- Merges credentials from multiple sources without duplication

### Devices
- **Key**: Serial number
- **Logic**: Uses Set for O(1) lookup performance
- Tracks serials to prevent duplicate device entries

## User Details Dialog

When a user card is clicked, the `UserDetailsDialog` component shows:
- All credential details (with passwords - masked by default)
- All device details (serial numbers, models, names)
- Antivirus status (from hardware_inventory)
- Branch assignment (with ability to change)
- Full device type reasoning

**Data Sources**:
- `master_user_list` - Base user data
- `device_user_assignments` - Current device
- `hardware_inventory` - Device details and antivirus
- `vpn_rdp_credentials` - VPN/RDP/M365 credentials
- `branches` - Branch list for dropdown

## Mapping Between Pages

### Master User Data Page → Dashboard
- Users from CSV imports populate `master_user_list`
- Branch assignments stored in `master_user_list.branch_id`
- Credentials stored in both `master_user_list` and `vpn_rdp_credentials`
- Dashboard reads and consolidates this data

### RDP Page → Dashboard
- RDP credentials in `vpn_rdp_credentials` (service_type='RDP')
- Dashboard counts these credentials
- Shows RDP badge if credentials exist

### VPN Page → Dashboard
- VPN credentials in `vpn_rdp_credentials` (service_type='VPN')
- Dashboard counts these credentials
- Shows VPN badge if credentials exist

### Branches Page → Dashboard
- Branch information in `branches` table
- Linked via `master_user_list.branch_id`
- Branch name displayed on each user card

## Technical Implementation

### Performance Optimizations
1. **Batch Queries**: Fetches all credentials/devices at once, then maps in memory
2. **Map-based Lookups**: Uses JavaScript Maps for O(1) lookup performance
3. **Set-based Deduplication**: Uses Set for serial number tracking
4. **Query Limits**: Limits to 500 users to prevent performance issues

### Error Handling
- Graceful fallbacks when tables are empty
- Console logging for debugging
- Continues execution if some queries fail
- Returns empty arrays/counts when data unavailable

### Data Synchronization
- Dashboard data reflects latest state from all tables
- No caching - always fetches fresh data
- Master_user_list serves as authoritative source
- Database triggers keep credentials in sync

## Testing the Data Flow

To verify the data consolidation is working:

1. **Add a user via Master User Data CSV import**
   - Verify user appears on dashboard
   - Check branch name displays correctly

2. **Add VPN credentials via VPN page**
   - Verify VPN badge appears on user card
   - Check count is correct

3. **Add RDP credentials via RDP page**
   - Verify RDP badge appears on user card
   - Check count is correct

4. **Assign a device via Device Assignments**
   - Verify device badge appears on user card
   - Check device count is correct

5. **Click user card**
   - Verify UserDetailsDialog shows all consolidated data
   - Check branch, credentials, and devices all display

## Future Enhancements

Potential improvements to data consolidation:
- [ ] Cache consolidated data for better performance
- [ ] Real-time updates using Supabase subscriptions
- [ ] Bulk operations for credential management
- [ ] Advanced filtering by branch, credentials, device type
- [ ] Export consolidated user data to CSV
