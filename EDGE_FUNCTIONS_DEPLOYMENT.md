# Edge Functions Deployment Guide

This guide explains how to deploy Supabase Edge Functions for the Oricol Helpdesk application.

## 📋 Available Edge Functions

| Function | Description | Environment Variables |
|----------|-------------|----------------------|
| `check-migrations` | Check database migration status | `SUPABASE_SERVICE_ROLE_KEY` |
| `confirm-provider-task` | Confirm service provider task completion | `SUPABASE_SERVICE_ROLE_KEY` |
| `import-staff-users` | Import staff users from VPN/RDP credentials | `SUPABASE_SERVICE_ROLE_KEY` |
| `m365-ediscovery-search` | Microsoft 365 eDiscovery search | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| `manage-user-roles` | Manage user roles (admin only) | `SUPABASE_SERVICE_ROLE_KEY` |
| `notify-ticket-assignment` | Send email notifications for ticket assignments | `RESEND_API_KEY` |
| `register-remote-client` | Register remote support clients | `SUPABASE_SERVICE_ROLE_KEY` |
| `resend-provider-email` | Resend emails to service providers | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `reset-user-password` | Reset user passwords (admin only) | `SUPABASE_SERVICE_ROLE_KEY` |
| `route-ticket-email` | Route ticket emails to providers | `RESEND_API_KEY` |
| `send-staff-onboarding-email` | Send staff onboarding emails | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_APP_URL` |
| `send-ticket-reminders` | Send ticket reminder emails | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `storage-admin-operations` | Admin storage operations | `SUPABASE_SERVICE_ROLE_KEY` |
| `sync-microsoft-365` | Sync data from Microsoft 365 | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` |

## 🚀 Deployment Options

### Option 1: Automated Deployment (Recommended)

Edge functions are automatically deployed when you push changes to the `main` branch.

**Trigger conditions:**
- Push to `main` branch with changes in `supabase/functions/**`
- Manual workflow dispatch

**Setup Requirements:**

1. Add GitHub Secrets (Repository Settings → Secrets → Actions):
   - `SUPABASE_ACCESS_TOKEN` - Get from [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens)
   - `SUPABASE_DB_PASSWORD` - Your database password

2. Push changes to trigger deployment:
   ```bash
   git add supabase/functions/
   git commit -m "Update edge functions"
   git push origin main
   ```

### Option 2: Manual Deployment via CLI

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to your project**
   ```bash
   supabase link --project-ref blhidceerkrumgxjhidq
   ```

4. **Deploy all functions**
   ```bash
   supabase functions deploy
   ```

5. **Or deploy a specific function**
   ```bash
   supabase functions deploy notify-ticket-assignment
   ```

### Option 3: Deploy via GitHub Actions Workflow Dispatch

1. Go to GitHub → Actions → "Deploy Edge Functions"
2. Click "Run workflow"
3. Choose options:
   - **Deploy all functions**: Check to deploy all functions
   - **Deploy specific function**: Enter function name to deploy only one

## 🔧 Environment Variables Setup

After deploying functions, set up environment variables in Supabase Dashboard:

### Required for All Functions

These are automatically available:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

### Email Functions (Resend)

Go to **Supabase Dashboard → Edge Functions → Secrets** and add:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

Get your API key from [Resend Dashboard](https://resend.com/api-keys).

### Microsoft 365 Functions

For `sync-microsoft-365` and `m365-ediscovery-search`:

```
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

For eDiscovery (optional):
```
EDISCOVERY_CASE_DISPLAY_NAME=Oricol eDiscovery Case
```

### Azure Functions

For `m365-ediscovery-search` (if using eDiscovery):

```
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Web App URL

For staff onboarding confirmation links:

```
WEB_APP_URL=https://oricol-ticket-flow-ten.vercel.app
```

## 📝 Setting Environment Variables

### Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/blhidceerkrumgxjhidq)
2. Navigate to **Edge Functions** in the sidebar
3. Click on **Secrets**
4. Add each environment variable as a new secret

### Via Supabase CLI

```bash
# Set a single secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Set multiple secrets
supabase secrets set MICROSOFT_CLIENT_ID=xxx MICROSOFT_CLIENT_SECRET=xxx MICROSOFT_TENANT_ID=xxx

# List all secrets
supabase secrets list
```

## 🧪 Testing Edge Functions

### Test locally

```bash
# Start local Supabase
supabase start

# Serve a specific function locally
supabase functions serve notify-ticket-assignment --env-file .env.local
```

### Test deployed function

```bash
# Using curl
curl -X POST 'https://blhidceerkrumgxjhidq.supabase.co/functions/v1/notify-ticket-assignment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"assigneeEmail": "test@example.com", "ticketId": "test-123", "ticketTitle": "Test Ticket"}'
```

### Test from the frontend

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('notify-ticket-assignment', {
  body: {
    assigneeEmail: 'test@example.com',
    ticketId: 'test-123',
    ticketTitle: 'Test Ticket'
  }
});
```

## 🔐 Security Configuration

All edge functions are configured with JWT verification enabled in `supabase/config.toml`:

```toml
[functions.function-name]
verify_jwt = true  # Requires valid authentication
```

This ensures that:
- Users must be authenticated to call functions
- Invalid or missing tokens are rejected
- Service role operations are protected

## 🐛 Troubleshooting

### "Function not found" Error

1. Verify the function is deployed:
   ```bash
   supabase functions list
   ```

2. Redeploy the function:
   ```bash
   supabase functions deploy function-name
   ```

### "Unauthorized" Error

1. Ensure you're passing a valid JWT token
2. Check that the token hasn't expired
3. Verify the user has appropriate permissions

### "Missing environment variable" Error

1. Set the required secret in Supabase Dashboard
2. Or via CLI: `supabase secrets set VARIABLE_NAME=value`

### "CORS Error"

All functions include CORS headers. If you're getting CORS errors:
1. Check that OPTIONS preflight is handled
2. Verify the origin is allowed
3. Check browser console for specific CORS error details

### Function Timeout

Edge functions have a 60-second timeout. For long-running operations:
1. Consider breaking into smaller chunks
2. Use background jobs for heavy processing
3. Return early with a status and poll for results

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

## ✅ Deployment Checklist

- [ ] GitHub secrets configured (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`)
- [ ] Supabase secrets configured (see Environment Variables section)
- [ ] Edge functions deployed successfully
- [ ] Test at least one function to verify deployment
- [ ] Web app can invoke edge functions
- [ ] Email notifications working (if using Resend)
- [ ] Microsoft 365 sync working (if configured)

---

Last Updated: December 2024
