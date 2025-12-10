# Vercel Deployment Fix

## Problem
The Vercel deployment workflow was failing with the following errors:
- `Error: No existing credentials found. Please run 'vercel login' or pass "--token"`
- `Error: You defined "--token", but it's missing a value`

## Root Cause
The `VERCEL_TOKEN` secret was not configured in the GitHub repository settings, causing the deployment workflow to fail.

## Solution
1. **Updated the workflow** (`.github/workflows/deploy-vercel.yml`) to:
   - Add validation step that checks for required secrets before attempting deployment
   - Provide clear error messages with instructions on how to configure missing secrets
   - Document all required secrets in the workflow comments

2. **Added helpful error messages** that guide users to:
   - The repository secrets settings page
   - Instructions on how to get a Vercel token
   - Links to Vercel documentation

## How to Configure Required Secrets

### Step 1: Get Your Vercel Token
1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a descriptive name (e.g., "GitHub Actions")
4. Select the appropriate scope (Full Account or Team)
5. Click "Create Token" and copy the token value

### Step 2: Add Secrets to GitHub
1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add the following secrets:

#### Required Secrets:
- **VERCEL_TOKEN**: Your Vercel API token (from Step 1)
- **VITE_SUPABASE_URL**: Your Supabase project URL
  - Format: `https://[project-ref].supabase.co`
- **VITE_SUPABASE_PUBLISHABLE_KEY**: Your Supabase anon/public key
  - Found in: Supabase Dashboard → Settings → API → anon public

#### Recommended Secrets:
- **VERCEL_ORG_ID**: Your Vercel organization/team ID
  - Find in: Vercel → Settings → General → Team ID
- **VERCEL_PROJECT_ID**: Your Vercel project ID
  - Find in: Vercel → Project Settings → General → Project ID

#### Optional Secrets (for migrations):
- **VITE_SUPABASE_PROJECT_ID**: Your Supabase project reference ID
- **SUPABASE_ACCESS_TOKEN**: For applying database migrations
- **SUPABASE_DB_PASSWORD**: For direct database access

## Testing the Fix
After configuring the secrets:
1. Push a commit to the `main` branch, or
2. Create a pull request to trigger a preview deployment
3. Check the GitHub Actions tab to verify the deployment succeeds

## Notes
- The workflow will now fail with a clear error message if `VERCEL_TOKEN` is missing
- The `continue-on-error: true` flag on the "Pull Vercel Environment Information" step ensures the workflow continues even if that step fails
- This fix provides better developer experience by making it obvious what's wrong and how to fix it
