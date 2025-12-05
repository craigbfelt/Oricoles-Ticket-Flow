# Edge Functions Setup Guide

This guide explains how to get all existing edge functions working with Supabase.

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **GitHub Repository Secrets**: Required secrets must be configured
3. **Supabase CLI**: Installed locally if you want to deploy manually

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Account → Access Tokens → Generate new token |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID | From your Supabase project URL: `https://supabase.com/dashboard/project/<PROJECT_REF>` |
| `SUPABASE_DB_PASSWORD` | Your Supabase database password | Set during project creation, or reset in Database Settings |

### Optional Secrets for Vercel Deployment

If using Vercel for the frontend:

| Secret Name | Description |
|-------------|-------------|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://blhidceerkrumgxjhidq.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |

## Available Edge Functions

The repository contains these edge functions:

| Function | Description |
|----------|-------------|
| `check-migrations` | Check database migration status |
| `confirm-provider-task` | Confirm provider task completion |
| `import-staff-users` | Import staff users from various sources |
| `m365-ediscovery-search` | Microsoft 365 eDiscovery search |
| `manage-user-roles` | Manage user roles and permissions |
| `notify-ticket-assignment` | Send notifications for ticket assignments |
| `register-remote-client` | Register remote client devices |
| `resend-provider-email` | Resend provider emails |
| `reset-user-password` | Reset user passwords |
| `route-ticket-email` | Route incoming ticket emails |
| `send-staff-onboarding-email` | Send onboarding emails to new staff |
| `send-ticket-reminders` | Send ticket reminder notifications |
| `storage-admin-operations` | Admin operations for storage |
| `sync-microsoft-365` | Sync data with Microsoft 365 |
| `verify-deployment` | Verify deployment status and health |

## Deployment Methods

### Method 1: Deploy All Functions (Recommended for Initial Setup)

1. Go to **Actions** tab in your GitHub repository
2. Select **"Deploy All Edge Functions"** workflow
3. Click **"Run workflow"**
4. Type `deploy` in the confirmation field
5. Click **"Run workflow"**

This will deploy all edge functions to your Supabase project.

### Method 2: Automatic Deployment on Push (Changed Functions Only)

The `deploy-changed-edge-functions.yml` workflow automatically deploys functions when they are modified:

1. Make changes to any edge function in `supabase/functions/`
2. Push to the `main` branch
3. The workflow automatically detects and deploys changed functions

### Method 3: Manual Deployment via CLI

Deploy individual functions locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy a specific function
supabase functions deploy function-name

# Deploy all functions
for fn in supabase/functions/*/; do
  fname=$(basename "$fn")
  if [ "$fname" != "_shared" ] && [ -f "$fn/index.ts" ]; then
    echo "Deploying $fname..."
    supabase functions deploy "$fname"
  fi
done
```

## Configuring Edge Function Environment Variables

Some edge functions require environment variables. Set them in the Supabase Dashboard:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** in the sidebar
4. Click on a function
5. Go to **Settings** tab
6. Add required environment variables

### Common Environment Variables

These are automatically available to all edge functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

> **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for functions that need to bypass Row Level Security (RLS), such as `sync-microsoft-365`, `manage-user-roles`, and other admin functions. While `SUPABASE_URL` and `SUPABASE_ANON_KEY` are usually auto-injected by Supabase, you may need to manually add `SUPABASE_SERVICE_ROLE_KEY` to your Edge Function secrets if it's not available.
>
> To find your Service Role Key:
> 1. Go to your Supabase Dashboard
> 2. Navigate to **Settings** → **API**
> 3. Copy the **Service Role Key** (under "Project API keys")
> 4. Add it to your Edge Function secrets

### Function-Specific Variables

For Microsoft 365 integration (`sync-microsoft-365`, `m365-ediscovery-search`):
- `MICROSOFT_TENANT_ID` - Your Azure AD tenant ID
- `MICROSOFT_CLIENT_ID` - Your Azure AD app client ID
- `MICROSOFT_CLIENT_SECRET` - Your Azure AD app client secret

For email functions (`send-staff-onboarding-email`, `resend-provider-email`):
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `WEB_APP_URL` - Your web application URL (for email links)

## Verifying Deployment

After deploying, verify your functions are working:

### 1. Check via Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**
4. Verify all functions are listed and have recent deployment timestamps

### 2. Call the verify-deployment Function

```bash
curl -X GET "https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-deployment" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

This returns a comprehensive status report of all migrations and edge functions.

### 3. Test Individual Functions

```bash
# Test check-migrations (requires auth)
curl -X GET "https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-migrations" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### "Function not found" Error

- Ensure the function is deployed: check the Edge Functions section in Supabase Dashboard
- Verify the function name is correct (case-sensitive)
- Run the "Deploy All Edge Functions" workflow to redeploy

### "Authorization required" Error

Most functions require JWT authentication. Include the auth header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Deployment Fails

1. Check that `SUPABASE_ACCESS_TOKEN` secret is set correctly
2. Verify `SUPABASE_PROJECT_REF` matches your project
3. Check the workflow logs for detailed error messages

### Function Returns 500 Error

1. Check function logs in Supabase Dashboard → Edge Functions → Your Function → Logs
2. Verify required environment variables are set
3. Check for syntax errors in the function code

## Security Configuration

All functions are configured with `verify_jwt = true` in `supabase/config.toml`. This means:
- All function calls require a valid JWT token
- Anonymous calls will be rejected
- This prevents unauthorized access and abuse

To change this for a specific function (not recommended for production):
```toml
[functions.your-function-name]
verify_jwt = false
```

## Support

If you encounter issues:
1. Check the [Supabase Documentation](https://supabase.com/docs/guides/functions)
2. Review function logs in the Supabase Dashboard
3. Open an issue in this repository
