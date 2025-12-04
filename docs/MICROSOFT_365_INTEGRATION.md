# Microsoft 365 Integration Guide

This guide covers the complete Microsoft 365 integration for Oricol Ticket Flow, including device sync from Intune and eDiscovery content search.

## Table of Contents

1. [Overview](#overview)
2. [Azure AD Setup](#azure-ad-setup)
3. [Environment Variables](#environment-variables)
4. [Device Sync](#device-sync)
5. [eDiscovery Search](#ediscovery-search)
6. [Troubleshooting](#troubleshooting)

## Overview

The Microsoft 365 integration provides:

- **Device Sync**: Automatically sync devices from Microsoft Intune/Endpoint Manager to the Hardware Inventory
- **User Sync**: Fetch user information from Azure AD
- **License Sync**: View subscribed Microsoft 365 licenses
- **eDiscovery Search**: Compliance-grade content search across mailboxes

## Azure AD Setup

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Enter a name (e.g., "Oricol Ticket Flow M365 Integration")
5. Select **Accounts in this organizational directory only**
6. Click **Register**

### 2. Note Application Details

After registration, note these values from the **Overview** page:
- **Application (client) ID** → `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_TENANT_ID`

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and set expiration
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately (you can't see it again)
   - This is your `AZURE_CLIENT_SECRET`

### 4. Configure API Permissions

Go to **API permissions** and add the following **Application permissions** (NOT Delegated):

#### For Device Sync (Intune)
- `DeviceManagementManagedDevices.Read.All` - Read managed devices

#### For User Sync
- `User.Read.All` - Read all users' full profiles

#### For License Sync
- `Organization.Read.All` - Read organization information

#### For eDiscovery Search
- `eDiscovery.ReadWrite.All` - Read and write eDiscovery cases
- `Mail.Read` or `Mail.ReadBasic.All` - Read mailbox content

### 5. Grant Admin Consent

After adding permissions, click **Grant admin consent for [Your Organization]** and confirm.

## Environment Variables

Set these environment variables in **Supabase Edge Functions**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions**
4. Add the following environment variables:

```bash
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
```

Optional:
```bash
EDISCOVERY_CASE_DISPLAY_NAME=Oricol eDiscovery Case
```

## Device Sync

### How It Works

The device sync pulls data from Microsoft Intune/Endpoint Manager and stores it in the `hardware_inventory` table.

### Synced Fields

| Intune Field | Hardware Inventory Field |
|-------------|-------------------------|
| deviceName | device_name |
| operatingSystem | os |
| osVersion | os_version |
| manufacturer | manufacturer |
| model | model |
| serialNumber | serial_number |
| physicalMemoryInBytes | ram_gb |
| totalStorageSpaceInBytes | storage_gb |
| complianceState | status |
| id | m365_device_id |
| userPrincipalName | m365_user_principal_name |
| lastSyncDateTime | m365_last_sync |
| enrolledDateTime | m365_enrolled_date |

### Sync Actions

From the Microsoft 365 Dashboard:

1. **Test Connection**: Verify Azure AD credentials are working
2. **Sync Devices**: Pull devices from Intune
3. **Sync Users**: Fetch user list from Azure AD
4. **Sync Licenses**: Get subscribed SKUs
5. **Full Sync**: Run all sync operations

### API Usage

```typescript
// Test connection
await supabase.functions.invoke('sync-microsoft-365', {
  body: { action: 'test_connection' }
});

// Sync devices
await supabase.functions.invoke('sync-microsoft-365', {
  body: { action: 'sync_devices' }
});

// Full sync
await supabase.functions.invoke('sync-microsoft-365', {
  body: { action: 'full_sync' }
});
```

## eDiscovery Search

### Features

- **KQL-based searches**: Use Keyword Query Language for precise searches
- **Mailbox targeting**: Search all mailboxes or specific ones
- **Fallback support**: Falls back to Graph API if eDiscovery is unavailable
- **Admin-only access**: Restricted to users with admin role

### Accessing eDiscovery

1. Log in as an admin user
2. Navigate to **Microsoft 365** dashboard
3. Click the **Security** tab
4. Use the "Microsoft 365 eDiscovery Content Search" panel

### KQL Query Examples

```kql
# Search by subject
subject:"quarterly report"

# Search by sender
from:john.doe@example.com

# Search by date range
received>=2024-01-01 AND received<=2024-12-31

# Search with attachments
hasattachment:true

# Combined search
subject:"invoice" AND from:finance@example.com AND hasattachment:true

# Search email body
body:"confidential information"
```

### API Usage

```typescript
// Start eDiscovery search
const { data } = await supabase.functions.invoke('m365-ediscovery-search', {
  body: {
    query: 'subject:"quarterly report"',
    targetMailboxes: ['user1@domain.com', 'user2@domain.com'] // optional
  }
});

// Check search status (if using eDiscovery)
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/m365-ediscovery-search?caseId=${caseId}&searchId=${searchId}`,
  {
    headers: { Authorization: `Bearer ${session.access_token}` }
  }
);
```

## Troubleshooting

### "Azure credentials not configured"

**Cause**: Environment variables are missing in Supabase.

**Solution**:
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
3. Wait a few minutes for changes to propagate

### "Failed to authenticate with Microsoft"

**Cause**: Invalid credentials or expired client secret.

**Solution**:
1. Verify tenant ID and client ID are correct
2. Check if client secret has expired
3. Create a new client secret if needed

### "Access denied" errors

**Cause**: Missing API permissions or admin consent.

**Solution**:
1. Verify all required permissions are added
2. Click "Grant admin consent" in Azure Portal
3. Wait 15-30 minutes for permissions to propagate

### "Failed to sync devices"

**Cause**: Missing DeviceManagementManagedDevices.Read.All permission.

**Solution**:
1. Add the DeviceManagementManagedDevices.Read.All permission
2. Grant admin consent
3. Wait for permission propagation

### No devices returned

**Cause**: No devices enrolled in Intune.

**Solution**:
1. Verify devices are enrolled in Microsoft Intune
2. Check the Intune admin portal for enrolled devices
3. Ensure the app has proper permissions

### eDiscovery falls back to Graph API

**Cause**: eDiscovery permissions not granted or unavailable.

**Solution**:
1. Add eDiscovery.ReadWrite.All permission
2. Grant admin consent
3. Note: eDiscovery requires Microsoft 365 E3/E5 or compliance add-on

## Security Considerations

- ✅ All Edge Functions require JWT authentication
- ✅ Admin role check before allowing sync operations
- ✅ Client credentials are stored securely in Supabase environment
- ✅ No secrets exposed to frontend
- ✅ Error messages don't expose stack traces

## Support

For issues:
1. Check Supabase Edge Function logs
2. Review Azure AD app audit logs
3. Verify API permissions in Azure Portal
4. Test with simpler queries/operations first
