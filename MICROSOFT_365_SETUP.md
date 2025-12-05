# Microsoft 365 Integration Setup Guide

This guide explains how to configure the Microsoft 365 sync tool in Supabase to sync devices, users, and licenses from your Azure AD/Intune environment.

## Prerequisites

1. **Azure AD App Registration** with the following permissions:
   - `DeviceManagementManagedDevices.Read.All` - To sync devices from Intune
   - `User.Read.All` - To sync users from Azure AD
   - `Organization.Read.All` - To test connection and read licenses
   
2. **Supabase Project** with Edge Functions enabled

3. **Database Migration Applied** - The `hardware_inventory` table must have the M365 columns

## Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
3. Name it something like "Oricol M365 Sync"
4. Set redirect URI to `https://your-supabase-project.supabase.co` (or leave empty for client credentials)
5. Click **Register**

After registration:
1. Note down the **Application (client) ID**
2. Note down the **Directory (tenant) ID**
3. Go to **Certificates & secrets** → **New client secret**
4. Create a secret and **immediately copy the value** (you won't see it again)

## Step 2: Grant API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add these permissions:
   - `DeviceManagementManagedDevices.Read.All`
   - `User.Read.All`
   - `Organization.Read.All`
4. Click **Grant admin consent for [Your Organization]**

## Step 3: Configure Supabase Edge Function Secrets

You must add the following secrets to your Supabase Edge Functions:

### Option A: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** in the left sidebar
4. Click on the `sync-microsoft-365` function
5. Go to **Settings** tab
6. Under **Secrets**, add the following:

| Secret Name | Value |
|-------------|-------|
| `AZURE_TENANT_ID` | Your Azure AD tenant ID (e.g., `12345678-1234-1234-1234-123456789012`) |
| `AZURE_CLIENT_ID` | Your app registration client ID |
| `AZURE_CLIENT_SECRET` | Your app registration client secret |
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://your-project-id.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (from Settings → API) |

### Option B: Via Supabase CLI

```bash
# Set secrets using the Supabase CLI
supabase secrets set AZURE_TENANT_ID=your-tenant-id
supabase secrets set AZURE_CLIENT_ID=your-client-id
supabase secrets set AZURE_CLIENT_SECRET=your-client-secret
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 4: Verify Database Migration

The M365 sync requires these columns in the `hardware_inventory` table:

```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'hardware_inventory' 
AND column_name LIKE 'm365%';
```

Expected columns:
- `m365_device_id` (TEXT, UNIQUE)
- `m365_user_principal_name` (TEXT)
- `m365_last_sync` (TIMESTAMPTZ)
- `m365_enrolled_date` (TIMESTAMPTZ)
- `synced_from_m365` (BOOLEAN)
- `deleted_manually` (BOOLEAN)

If these columns don't exist, apply the migration:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE public.hardware_inventory 
ADD COLUMN IF NOT EXISTS m365_device_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS m365_user_principal_name TEXT,
ADD COLUMN IF NOT EXISTS m365_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS m365_enrolled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS synced_from_m365 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_manually BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_m365_device_id 
ON public.hardware_inventory(m365_device_id) 
WHERE m365_device_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hardware_inventory_synced_from_m365 
ON public.hardware_inventory(synced_from_m365) 
WHERE synced_from_m365 = TRUE;
```

## Step 5: Test the Connection

1. Log in to the Oricol Ticket Flow application as an **admin** user
2. Navigate to **Microsoft 365 Dashboard**
3. Click **Test Connection**
4. If successful, you should see your organization name

## Troubleshooting

### Error: "Missing environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET"

**Cause**: The Azure credentials are not configured in Supabase Edge Function secrets.

**Solution**: Follow Step 3 to add the secrets via Supabase Dashboard.

### Error: "Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"

**Cause**: The Supabase credentials are not configured.

**Solution**: Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function secrets.

To find your Service Role Key:
1. Go to Supabase Dashboard → Settings → API
2. Find "service_role key" under "Project API keys"
3. Copy the key and add it as a secret

### Error: "Access denied. Ensure the app has DeviceManagementManagedDevices.Read.All permission"

**Cause**: The Azure app doesn't have proper permissions or admin consent wasn't granted.

**Solution**: 
1. Go to Azure Portal → App registrations → Your app → API permissions
2. Verify the required permissions are added
3. Click "Grant admin consent" if not already done

### Error: "Failed to authenticate with Microsoft: 401"

**Cause**: Invalid client credentials or the secret has expired.

**Solution**:
1. Verify the `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are correct
2. If the secret expired, create a new one in Azure Portal
3. Update the `AZURE_CLIENT_SECRET` in Supabase

### Error: "Access denied. Only admins can sync Microsoft 365 data"

**Cause**: The logged-in user doesn't have the admin role.

**Solution**: Assign admin role to the user:

```sql
-- Run in Supabase SQL Editor
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Error: "CORS preflight request failed"

**Cause**: Edge function configuration issue.

**Solution**: Verify `supabase/config.toml` has:
```toml
[functions.sync-microsoft-365]
verify_jwt = false  # JWT verification is handled inside the function
```

## Quick Reference: Required Supabase Secrets

| Secret | Description | Where to Find |
|--------|-------------|---------------|
| `AZURE_TENANT_ID` | Azure AD Directory ID | Azure Portal → Azure AD → Overview |
| `AZURE_CLIENT_ID` | App Registration Client ID | Azure Portal → App registrations → Your App → Overview |
| `AZURE_CLIENT_SECRET` | App Secret Value | Azure Portal → App registrations → Your App → Certificates & secrets |
| `SUPABASE_URL` | Supabase Project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | Supabase Dashboard → Settings → API |

## Support

If you continue to experience issues:

1. Check the Edge Function logs in Supabase Dashboard → Edge Functions → sync-microsoft-365 → Logs
2. Verify all secrets are set correctly
3. Ensure the database migration has been applied
4. Confirm the Azure app has admin consent for all permissions
