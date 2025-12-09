# CSV-Based User Management System - Implementation Plan

## Overview

This document outlines the plan to transition from dynamically pulling user data from Microsoft 365/Intune to a fixed/static user list managed through CSV imports from RDP/VPN user spreadsheets.

## Current Architecture

Currently, the Dashboard pulls user data from:
- `directory_users` table - populated from Microsoft 365/Intune sync
- `hardware_inventory` table - device information from Intune
- `vpn_rdp_credentials` table - VPN/RDP credentials

## New Architecture Goals

1. **Fixed User List**: User list should be static and imported from CSV files (RDP/VPN spreadsheets from Graeme)
2. **Device Serial Number Matching**: Use device serial numbers as unique identifiers to match Intune devices with users
3. **Change Detection**: System should detect and report:
   - Username/email changes for existing devices
   - New PCs replacing old ones
   - Devices being reassigned between users
4. **Manual Entry**: Support for thin client PCs that don't appear in Intune
5. **Update Control**: User list should only update when staff changes, device reassignments, or PC replacements occur

## Database Schema Changes

### 1. Create Master User List Table

```sql
CREATE TABLE IF NOT EXISTS public.master_user_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  job_title TEXT,
  department TEXT,
  branch_id UUID REFERENCES public.branches(id),
  vpn_username TEXT,
  rdp_username TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'csv_import', -- 'csv_import', 'manual', 'intune'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  imported_at TIMESTAMPTZ,
  imported_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX idx_master_user_list_email ON public.master_user_list(email);
CREATE INDEX idx_master_user_list_tenant ON public.master_user_list(tenant_id);
```

### 2. Create Device User Assignment Table

This table tracks which devices are assigned to which users, using serial numbers as the key.

```sql
CREATE TABLE IF NOT EXISTS public.device_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL,
  user_email TEXT NOT NULL,
  device_name TEXT,
  device_model TEXT,
  assignment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  assignment_source TEXT DEFAULT 'auto', -- 'auto', 'manual', 'intune_sync'
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  CONSTRAINT unique_current_device_assignment UNIQUE (device_serial_number, is_current) WHERE is_current = true
);

CREATE INDEX idx_device_assignments_serial ON public.device_user_assignments(device_serial_number);
CREATE INDEX idx_device_assignments_email ON public.device_user_assignments(user_email);
CREATE INDEX idx_device_assignments_tenant ON public.device_user_assignments(tenant_id);
```

### 3. Create Device Change History Table

Track changes in device assignments to detect reassignments and replacements.

```sql
CREATE TABLE IF NOT EXISTS public.device_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'new_device', 'reassignment', 'replacement', 'username_change', 'email_change'
  old_user_email TEXT,
  new_user_email TEXT,
  old_username TEXT,
  new_username TEXT,
  detected_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX idx_device_changes_serial ON public.device_change_history(device_serial_number);
CREATE INDEX idx_device_changes_reviewed ON public.device_change_history(reviewed);
CREATE INDEX idx_device_changes_tenant ON public.device_change_history(tenant_id);
```

### 4. Create Manual Devices Table

For thin clients and other devices not in Intune.

```sql
CREATE TABLE IF NOT EXISTS public.manual_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT DEFAULT 'thin_client', -- 'thin_client', 'desktop', 'laptop', 'other'
  device_model TEXT,
  assigned_user_email TEXT,
  connection_type TEXT, -- 'rdp', 'vpn', 'direct'
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX idx_manual_devices_serial ON public.manual_devices(device_serial_number);
CREATE INDEX idx_manual_devices_email ON public.manual_devices(assigned_user_email);
CREATE INDEX idx_manual_devices_tenant ON public.manual_devices(tenant_id);
```

## Implementation Steps

### Phase 1: Database Schema (Immediate)
- [ ] Create migration file with all new tables
- [ ] Add RLS policies for new tables
- [ ] Add triggers for updated_at columns

### Phase 2: CSV Import UI (Week 1)
- [ ] Create CSV import page/component
- [ ] Support CSV formats for:
  - RDP user list (email, name, rdp_username, etc.)
  - VPN user list (email, name, vpn_username, etc.)
  - Combined user list
- [ ] Validate CSV data before import
- [ ] Show import preview with data validation errors
- [ ] Import data into `master_user_list` table
- [ ] Log import history

### Phase 3: Device Serial Number Matching (Week 1-2)
- [ ] Create background job/function to compare:
  - `hardware_inventory.serial_number` with `device_user_assignments.device_serial_number`
  - `hardware_inventory.m365_user_principal_name` with `master_user_list.email`
- [ ] Detect changes and create entries in `device_change_history`
- [ ] Create UI to review and approve detected changes
- [ ] Auto-update `device_user_assignments` for approved changes

### Phase 4: Manual Device Management (Week 2)
- [ ] Create UI for adding/editing manual devices
- [ ] Form to input:
  - Serial number
  - Device name
  - Device type
  - Model
  - Assigned user (dropdown from master_user_list)
  - Connection type
  - Location/Branch
- [ ] List view of manual devices
- [ ] Edit/delete capabilities

### Phase 5: Dashboard Integration (Week 2-3)
- [ ] Update Dashboard.tsx to pull from:
  - `master_user_list` instead of `directory_users`
  - `device_user_assignments` for device info
  - Merge with `manual_devices` data
- [ ] Show device change alerts on Dashboard
- [ ] Add "Changes Pending Review" card/badge
- [ ] Update user detail pages

### Phase 6: Future Enhancement - PC Agent Tool (Future)
- [ ] Design lightweight agent application
- [ ] Collect PC information:
  - Serial number
  - Hostname
  - Model/Manufacturer
  - CPU/RAM/Disk specs
  - Installed software
  - Current user
- [ ] Push data to Oricol dashboard API endpoint
- [ ] Auto-update device information

## CSV File Format Specifications

### RDP Users CSV Format
```csv
email,display_name,rdp_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_rdp,Manager,IT,Head Office,
```

### VPN Users CSV Format
```csv
email,display_name,vpn_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_vpn,Manager,IT,Head Office,
```

### Combined Users CSV Format
```csv
email,display_name,vpn_username,rdp_username,job_title,department,branch,notes
user@afripipes.co.za,John Doe,jdoe_vpn,jdoe_rdp,Manager,IT,Head Office,
```

## Benefits

1. **Control**: Full control over who appears in the user list
2. **Accuracy**: User list matches actual staff, not just device users
3. **Audit Trail**: Complete history of device changes and reassignments
4. **Flexibility**: Support for devices not in Intune (thin clients)
5. **Change Detection**: Automatic detection of username/email changes based on serial numbers
6. **Separation of Concerns**: User list is independent of device inventory

## Migration Strategy

1. **Import initial user list** from current `directory_users` table
2. **Import device assignments** from current `hardware_inventory` table
3. **Run initial sync** to populate `device_user_assignments`
4. **Switch Dashboard** to use new tables
5. **Continue M365 sync** to `hardware_inventory` for device data
6. **Compare and detect changes** automatically
7. **Gradually add manual devices** as needed

## Security Considerations

- RLS policies to ensure users can only see their own data (unless admin)
- Admin-only access to CSV import functionality
- Audit logging for all imports and changes
- Email validation to prevent invalid data
- Serial number uniqueness enforcement

## Testing Plan

1. Test CSV import with various formats
2. Test device matching algorithm with sample data
3. Test change detection logic
4. Test manual device addition
5. Test Dashboard display with mixed data sources
6. Test RLS policies for different user roles
7. Test performance with large datasets (500+ users, 1000+ devices)
