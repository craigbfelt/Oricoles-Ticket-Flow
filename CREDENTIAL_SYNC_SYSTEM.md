# Credential Synchronization System

## Overview

This system establishes `master_user_list` as the **single source of truth** for all user credentials (VPN, RDP, M365). Any changes made to this table automatically propagate to all other relevant tables in the system.

## Key Features

### 1. Single Source of Truth
- **master_user_list** is the central repository for all user credentials
- All credential changes must go through this table
- Automatic synchronization to `vpn_rdp_credentials` and other tables

### 2. Bi-Directional Sync
- Changes to `master_user_list` → Auto-sync to `vpn_rdp_credentials`
- Manual edits to `vpn_rdp_credentials` → Sync back to `master_user_list`
- No duplicates - credentials are deduplicated by email + service_type

### 3. Intelligent CSV Import
- Import CSV files with only changed fields
- Preview all changes before importing
- Selective field import (choose which fields to update)
- Change tracking and diff display
- No overwrite of unchanged data

### 4. Master User Data Management Page
- View all users in one editable table
- Inline editing of credentials
- Real-time sync status
- Export functionality
- Search and filter capabilities

## Database Schema

### master_user_list Table

```sql
master_user_list (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  job_title TEXT,
  department TEXT,
  branch_id UUID REFERENCES branches(id),
  
  -- Credential fields (SOURCE OF TRUTH)
  vpn_username TEXT,
  vpn_password TEXT,
  rdp_username TEXT,
  rdp_password TEXT,
  m365_username TEXT,
  m365_password TEXT,
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  source TEXT, -- 'csv_import', 'manual', etc.
  credentials_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Synchronization Triggers

1. **sync_credentials_from_master()**: Triggers on INSERT/UPDATE of master_user_list
   - Syncs VPN credentials to vpn_rdp_credentials
   - Syncs RDP credentials to vpn_rdp_credentials
   - Creates or updates existing credentials

2. **sync_credentials_to_master()**: Triggers on UPDATE of vpn_rdp_credentials
   - Syncs manual edits back to master_user_list
   - Maintains master_user_list as source of truth

## How to Use

### 1. Import Users via CSV

Navigate to **Master User Data Management** (`/master-user-data`):

1. Click "Import CSV"
2. Select your CSV file (must have at least 'email' column)
3. Review the preview showing:
   - New users (green badge)
   - Updated users (yellow badge)
   - Changes for each field
4. Select which fields to import (uncheck fields you don't want to update)
5. Click "Import" to apply changes

**CSV Format:**
```csv
email,display_name,job_title,department,vpn_username,vpn_password,rdp_username,rdp_password,m365_username,m365_password
user@company.com,John Doe,Manager,IT,jdoe_vpn,vpnpass123,jdoe_rdp,rdppass456,john.doe@company.com,m365pass789
```

### 2. Manual Editing

From the Master User Data Management page:

1. Find the user (use search if needed)
2. Click the Edit icon
3. Modify any credential fields
4. Click the Check mark to save
5. Changes automatically sync across all tables

### 3. Viewing Consolidated Data

Any page can now use the consolidated data utility:

```typescript
import { fetchConsolidatedUserData } from '@/lib/userDataConsolidation';

const userData = await fetchConsolidatedUserData(userId, email);

// Access credentials
console.log(userData.vpn_credentials); // All VPN credentials (deduplicated)
console.log(userData.rdp_credentials); // All RDP credentials (deduplicated)
console.log(userData.branch); // Consolidated branch info
console.log(userData.devices); // All devices (deduplicated)
```

### 4. Force Sync

If you need to manually trigger a full sync:

1. Go to Master User Data Management page
2. Click "Sync Now" button
3. System will sync all credentials from master_user_list to vpn_rdp_credentials

Or via SQL:
```sql
SELECT * FROM perform_initial_credential_sync();
```

## Data Flow Diagram

```
┌─────────────────────┐
│  CSV Import         │
│  (New/Updated Data) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐      Triggers      ┌──────────────────────┐
│  master_user_list   │◄──────────────────►│ vpn_rdp_credentials  │
│  (SOURCE OF TRUTH)  │    Bi-directional  │  (Synced Table)      │
└──────────┬──────────┘       Sync         └──────────────────────┘
           │
           │ Auto-sync
           │
           ▼
┌─────────────────────┐
│   All Pages/Views   │
│  - UserDetails      │
│  - Dashboard        │
│  - Users            │
│  - Etc.             │
└─────────────────────┘
```

## Benefits

### 1. No Duplicates
- Credentials are deduplicated by email + service_type
- Only one VPN credential per user
- Only one RDP credential per user
- Only one M365 credential per user

### 2. Consistency
- All pages see the same data
- Updates in one place reflect everywhere
- No stale data

### 3. Audit Trail
- `credentials_updated_at` tracks last change
- `source` field shows where data came from
- Full change history (can be extended)

### 4. Ease of Use
- Single page to manage all credentials
- CSV import for bulk updates
- Inline editing for quick changes
- Search and filter for finding users

### 5. Intelligent Import
- Only updates changed fields
- Preview before importing
- Selective field updates
- No accidental overwrites

## Migration

The database migration `20251217000000_create_credential_sync_system.sql` sets up:

1. New columns in master_user_list (m365_username, m365_password, credentials_updated_at)
2. Sync triggers (bi-directional)
3. Sync functions
4. Indexes for performance

To apply:
```bash
npm run migrate:apply
```

Or run the SQL directly in Supabase SQL Editor.

## Pages Updated

1. **UserDetails.tsx** - Now uses consolidated data utility
2. **MasterUserData.tsx** (NEW) - Central management interface
3. **Dashboard.tsx** - Already showing branch info from master source
4. **Users.tsx** - Compatible with sync system

## API Functions

### Database Functions

- `sync_credentials_from_master()` - Auto-sync from master_user_list
- `sync_credentials_to_master()` - Auto-sync to master_user_list
- `perform_initial_credential_sync()` - Manual full sync

### Frontend Functions

- `fetchConsolidatedUserData(userId?, email?)` - Get complete user data
- `fetchAllConsolidatedUsers()` - Get all users with consolidated data
- `getCredentialsSummary(user)` - Get credential count summary
- `getBranchDisplayName(user)` - Get best branch name
- `hasCredentials(user)` - Check if user has any credentials
- `getAllCredentialUsernames(user)` - Get all unique usernames

## Security

- RLS policies still apply
- Admin/support_staff access required for credentials
- Passwords encrypted at rest (existing encryption system)
- Audit trail via timestamps

## Troubleshooting

### Changes not syncing?

1. Check that triggers are enabled:
```sql
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgrelid = 'master_user_list'::regclass;
```

2. Force a manual sync:
```sql
SELECT * FROM perform_initial_credential_sync();
```

### Duplicate credentials appearing?

This should not happen with the new system, but if it does:

1. Check for credentials not linked to master_user_list
```sql
SELECT * FROM vpn_rdp_credentials 
WHERE email NOT IN (SELECT email FROM master_user_list);
```

2. Remove orphaned credentials or link them to master_user_list

### Import not working?

1. Ensure CSV has required 'email' column
2. Check that user has admin permissions
3. Review browser console for errors
4. Check Supabase logs for database errors

## Future Enhancements

Potential additions:

1. **Version History** - Track all changes to credentials over time
2. **Rollback** - Ability to revert to previous versions
3. **Bulk Operations** - Mass update multiple users at once
4. **Password Generation** - Auto-generate secure passwords
5. **Expiry Tracking** - Password expiration and rotation
6. **Access Logs** - Who accessed which credentials and when
7. **API Endpoints** - RESTful API for external integrations
8. **Webhook Notifications** - Alert on credential changes

## Conclusion

The Credential Synchronization System provides a robust, centralized way to manage user credentials across the entire application. With automatic syncing, intelligent imports, and a user-friendly management interface, it eliminates duplicate data and ensures consistency throughout the system.
