# Supabase Connection Verification Guide

This guide helps you verify that your GitHub repository is correctly connected to the right Supabase account and database.

## 🚀 Quick Verification

Run the automated verification script:

```bash
npm run verify:supabase
```

This will check:
- ✅ Environment variables are configured correctly
- ✅ Supabase connection is working
- ✅ Database schema exists and is accessible
- ✅ Migration files are present

## Expected Supabase Configuration

Based on this repository's configuration, the correct Supabase project should be:

- **Project ID**: `blhidceerkrumgxjhidq`
- **Project URL**: `https://blhidceerkrumgxjhidq.supabase.co`
- **Location**: Your Supabase dashboard at https://supabase.com/dashboard

## What the Verification Script Checks

### 1. Environment Variables Check ✅

The script verifies that your `.env` file contains:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your public/anon key
- `VITE_SUPABASE_PROJECT_ID` - Your project reference ID

It also checks that these values match the expected configuration from `.env.example` and `supabase/config.toml`.

### 2. Supabase Connection Test 🔌

The script attempts to connect to your Supabase instance using the REST API to verify:
- The URL is accessible
- The API key is valid
- Authentication works correctly

### 3. Database Schema Check 📊

The script checks for the existence of expected database tables:
- `profiles` - User profile information
- `user_roles` - Role-based access control
- `tickets` - Support ticket management
- `assets` - Asset tracking
- `branches` - Branch/location management
- `devices` - Device inventory
- `licenses` - Software license tracking

### 4. Migrations Status 📝

The script verifies that migration files are present and provides information on how to apply them.

## Understanding the Results

### ✅ All Checks Passed

If all checks pass, you'll see:
```
✓ ALL CHECKS PASSED

Your GitHub repository is correctly configured with Supabase!

Expected Supabase Project:
  Project ID: blhidceerkrumgxjhidq
  URL: https://blhidceerkrumgxjhidq.supabase.co
```

This means your repository is connected to the correct Supabase account and database.

### ❌ Some Checks Failed

If checks fail, the script will show you specific errors and suggestions for fixing them.

## Common Issues and Solutions

### Issue 1: Missing .env File

**Error**: `.env file not found`

**Solution**:
```bash
cp .env.example .env
```

Then edit the `.env` file with your actual Supabase credentials:
1. Go to https://supabase.com/dashboard
2. Select your project (`blhidceerkrumgxjhidq`)
3. Go to Project Settings → API
4. Copy the values into your `.env` file

### Issue 2: Project ID Mismatch

**Error**: `Project ID mismatch!`

This means your `.env` file is configured for a different Supabase project.

**Solution**:

**Option A - Update .env to use the correct project** (Recommended):
1. Open your `.env` file
2. Change the values to match the expected project:
   ```env
   VITE_SUPABASE_URL="https://blhidceerkrumgxjhidq.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
   VITE_SUPABASE_PROJECT_ID="blhidceerkrumgxjhidq"
   ```
3. Get the anon key from https://supabase.com/dashboard → Project Settings → API

**Option B - Using a different Supabase project** (Advanced):

If you intentionally want to use a different Supabase project:
1. Update `supabase/config.toml` with your project ID
2. Update `.env.example` to reflect the new expected values
3. Run migrations on your Supabase project:
   ```bash
   npm run migrate
   ```

### Issue 3: Connection Failed

**Error**: `Connection failed with status: 401` or `Connection failed: ...`

**Possible causes**:
- Invalid API key
- Incorrect project URL
- Network issues

**Solution**:
1. Verify your API key in Supabase Dashboard → Project Settings → API
2. Ensure you're using the **anon/public key**, not the service_role key
3. Check that the URL is correct (should match `https://YOUR-PROJECT-ID.supabase.co`)
4. Try accessing the URL in your browser to verify it's reachable

### Issue 4: No Tables Found

**Error**: `No tables found - database may not be initialized`

**Solution**:

Your database schema hasn't been created yet. Apply migrations:

```bash
# Using the migration script
npm run migrate

# Or using Supabase CLI
npx supabase link --project-ref blhidceerkrumgxjhidq
npx supabase db push
```

**Manual migration** (if CLI doesn't work):
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Run each migration file from `supabase/migrations/` in chronological order

## Manual Verification Methods

If you prefer to verify manually or if the script fails, you can check these items:

### Method 1: Check Supabase Dashboard

1. **Log into Supabase**: https://supabase.com/dashboard
2. **Find your project**: Look for project ID `blhidceerkrumgxjhidq`
3. **Verify project settings**:
   - Go to Project Settings → General
   - Confirm the Reference ID matches `blhidceerkrumgxjhidq`
4. **Check tables**:
   - Go to Table Editor
   - Verify tables exist: profiles, tickets, assets, etc.

### Method 2: Check Configuration Files

**Check `.env` file**:
```bash
cat .env | grep SUPABASE
```

**Check `supabase/config.toml`**:
```bash
cat supabase/config.toml | grep project_id
```

**Check `.env.example`** (expected values):
```bash
cat .env.example | grep SUPABASE
```

All three should have consistent project IDs.

### Method 3: Test Connection with curl

Test the REST API directly:

```bash
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://blhidceerkrumgxjhidq.supabase.co/rest/v1/
```

If successful, you should see: `{"message":"The server is running."}`

## Security Notes

⚠️ **Important Security Reminders**:

1. **Never commit `.env` file to Git**
   - The `.gitignore` file already excludes it
   - Only commit `.env.example` with placeholder values

2. **Never expose service_role key**
   - Only use the **anon/public key** in your `.env` file
   - The service_role key should only be used in GitHub Secrets for CI/CD

3. **Rotate keys if exposed**
   - If you accidentally commit keys, rotate them immediately
   - Go to Supabase Dashboard → Project Settings → API → Generate new keys

## Getting Help

If you're still having issues:

1. **Check the documentation**:
   - [README.md](./README.md) - Main project documentation
   - [QUICKSTART_GITHUB_SUPABASE.md](./QUICKSTART_GITHUB_SUPABASE.md) - Setup guide
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Detailed Supabase configuration

2. **Review migration guides**:
   - [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md) - Migration guide
   - [AUTOMATED_MIGRATION_SETUP.md](./AUTOMATED_MIGRATION_SETUP.md) - Automated setup

3. **Check Supabase documentation**: https://supabase.com/docs

4. **GitHub Issues**: Create an issue in the repository with the output from `npm run verify:supabase`

## Next Steps After Verification

Once verification passes:

1. **Apply migrations** (if not already done):
   ```bash
   npm run migrate
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the app**: Open http://localhost:8080

4. **Create an admin account**: See [ADMIN_ACCOUNT_SETUP.md](./ADMIN_ACCOUNT_SETUP.md)

5. **Deploy to production**: See [VERCEL_SUPABASE_MIGRATION.md](./VERCEL_SUPABASE_MIGRATION.md)

## Automated CI/CD Verification

The verification script can also be used in your CI/CD pipeline to ensure proper configuration before deployment.

Add to your GitHub Actions workflow:

```yaml
- name: Verify Supabase Connection
  run: npm run verify:supabase
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
    VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
```

This ensures that every deployment uses the correct Supabase configuration.

---

**Last Updated**: January 2026  
**Script Location**: `scripts/verify-supabase-connection.cjs`  
**Command**: `npm run verify:supabase`
