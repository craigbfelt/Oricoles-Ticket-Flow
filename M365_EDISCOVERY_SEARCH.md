# Microsoft 365 eDiscovery Content Search - Deployment Guide

## Overview

This feature adds compliance-grade eDiscovery content search functionality to the Microsoft 365 dashboard, allowing administrators to search mailbox content across the tenant using KQL (Keyword Query Language).

## Features

- **KQL-based searches**: Use advanced query syntax for precise searches
- **Mailbox targeting**: Search all mailboxes or specific ones
- **Export management**: Track export status and download results
- **Fallback support**: Automatically falls back to Graph search API if eDiscovery is unavailable
- **Admin-only access**: Only users with admin role can access the search panel

## Prerequisites

### 1. Azure AD App Registration

Create an app registration in Azure AD with the following configuration:

1. Navigate to Azure Portal > Azure Active Directory > App registrations
2. Create a new registration or use an existing one
3. Note the following values:
   - **Application (client) ID**
   - **Directory (tenant) ID**
4. Create a **client secret** under Certificates & secrets
   - Note the secret value (you can only see it once)

### 2. API Permissions

Grant the following **Application** permissions (not Delegated):

- `eDiscovery.ReadWrite.All` - Required for creating and managing eDiscovery cases and searches
- `Mail.Read` or `Mail.ReadBasic.All` - Required for accessing mailbox content

**Important**: After adding permissions, click **Grant admin consent** for your tenant.

### 3. Environment Variables

Set the following environment variables in your Lovable/Supabase deployment:

```bash
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
EDISCOVERY_CASE_DISPLAY_NAME="Oricol eDiscovery Case"  # Optional, defaults to this value
```

For local development, you can also set:
```bash
VITE_M365_EDISCOVERY_ENDPOINT=http://localhost:54321/functions/v1/m365-ediscovery-search
```

## Deployment Steps

### For Lovable Deployment

1. **Environment Variables**:
   - Go to your Lovable project settings
   - Add the environment variables listed above

2. **Deploy the Supabase Function**:
   ```bash
   supabase functions deploy m365-ediscovery-search
   ```

3. **Verify**:
   - Build completes: `npm run build`
   - Linting passes: `npm run lint`
   - Function is accessible at: `https://<your-project>.supabase.co/functions/v1/m365-ediscovery-search`

## Usage

### Accessing the Feature

1. Log in as an admin user
2. Navigate to **Microsoft 365** dashboard
3. Click on the **Security** tab
4. You'll see the "Microsoft 365 eDiscovery Content Search" panel

### Creating a Search

1. **Enter a KQL Query**: 
   - Example: `subject:"confidential" AND from:user@domain.com`
   - Example: `received>=2024-01-01 AND hasattachment:true`

2. **Specify Target Mailboxes** (optional):
   - Leave empty to search all tenant mailboxes
   - Or enter specific emails: `user1@domain.com, user2@domain.com`

3. **Click "Start eDiscovery Search"**

4. **Monitor Progress**:
   - Export ID and status will be displayed
   - Progress percentage updates automatically
   - Download button appears when export is ready

## KQL Query Examples

```kql
# Search for emails with specific subject
subject:"quarterly report"

# Search emails from a specific sender
from:john.doe@example.com

# Search emails in a date range
received>=2024-01-01 AND received<=2024-12-31

# Search for emails with attachments
hasattachment:true

# Combine multiple conditions
subject:"invoice" AND from:finance@example.com AND hasattachment:true

# Search for specific content in email body
body:"confidential information"
```

## Architecture

### Frontend
- **ContentSearchPanel.tsx**: React component in Security tab
- Displays search UI and results
- Polls for export status every 10 seconds
- Admin-only rendering via `isAdmin` check

### Backend
- **m365-ediscovery-search/index.ts**: Supabase Edge Function
- Handles two request types:
  - **POST**: Creates eDiscovery search
  - **GET**: Polls export status by exportId
- Implements fallback to Graph search API
- Secure error handling without stack trace exposure

## Security Considerations

- ✅ Admin-only access enforced in UI
- ✅ Application-level permissions (no user delegation)
- ✅ Environment variables for credentials
- ✅ No stack trace exposure in error responses
- ✅ Audit logging via console.log (monitor in Supabase logs)
- ⚠️ **Important**: Add authentication middleware to verify caller is admin before production use

## Troubleshooting

### "Azure credentials not configured"
- Verify environment variables are set correctly in Supabase
- Restart the function after adding env vars

### "Failed to authenticate with Microsoft"
- Check client secret is valid (they expire)
- Verify tenant ID is correct
- Ensure client ID matches the app registration

### "Failed to list cases"
- Check API permissions are granted
- Verify admin consent was provided
- Function will automatically fall back to Graph search API

### No results returned
- Verify KQL query syntax is correct
- Check user has permissions to the mailboxes
- Review Supabase function logs for errors

## Support

For issues or questions:
1. Check Supabase function logs
2. Review Azure AD app audit logs
3. Verify API permissions and admin consent
4. Test with a simple KQL query like `subject:"test"`

## Future Enhancements

Potential improvements:
- Full eDiscovery workflow (review sets, custodians)
- Export download with progress tracking
- Search history and saved queries
- Advanced filters and date pickers
- Batch operations on multiple mailboxes
- Integration with Microsoft Purview Compliance Center
