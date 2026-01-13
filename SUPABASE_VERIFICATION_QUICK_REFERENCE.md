# Supabase Connection Verification - Quick Reference

## 🚀 Quick Verification Command

```bash
npm run verify:supabase
```

This command will verify that your GitHub repository is correctly connected to the expected Supabase account and database.

## ✅ Expected Configuration

Your repository should be connected to:

- **Project ID**: `blhidceerkrumgxjhidq`
- **Project URL**: `https://blhidceerkrumgxjhidq.supabase.co`
- **Dashboard**: https://supabase.com/dashboard

## 📋 What Gets Checked

The verification tool performs 4 comprehensive checks:

### 1. Environment Variables ✓
- Verifies `.env` file exists
- Checks required variables are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- Validates values match expected configuration
- Ensures consistency with `supabase/config.toml`

### 2. Supabase Connection ✓
- Tests REST API connectivity
- Validates API key authentication
- Confirms project is accessible

### 3. Database Schema ✓
- Checks for expected tables:
  - `profiles`, `user_roles`, `tickets`, `assets`
  - `branches`, `devices`, `licenses`
- Verifies tables are accessible
- Confirms database is initialized

### 4. Migrations Status ✓
- Lists available migration files
- Provides migration count
- Shows how to apply migrations

## 📖 Full Documentation

For detailed information, troubleshooting, and common issues:

**[SUPABASE_VERIFICATION_GUIDE.md](./SUPABASE_VERIFICATION_GUIDE.md)**

## 🔧 Common Scenarios

### Scenario 1: First-time Setup
```bash
# Step 1: Create .env file
cp .env.example .env

# Step 2: Edit .env with your credentials
# Get values from https://supabase.com/dashboard

# Step 3: Verify configuration
npm run verify:supabase

# Step 4: Apply migrations
npm run migrate
```

### Scenario 2: Wrong Supabase Project
If verification shows a project ID mismatch:

```bash
# Update .env file with correct values
# Expected: blhidceerkrumgxjhidq
VITE_SUPABASE_PROJECT_ID="blhidceerkrumgxjhidq"
VITE_SUPABASE_URL="https://blhidceerkrumgxjhidq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"

# Re-verify
npm run verify:supabase
```

### Scenario 3: Missing Database Schema
If verification shows no tables found:

```bash
# Apply migrations to create schema
npm run migrate
```

## 🎯 Success Output

When everything is configured correctly, you'll see:

```
✓ ALL CHECKS PASSED

Your GitHub repository is correctly configured with Supabase!

Expected Supabase Project:
  Project ID: blhidceerkrumgxjhidq
  URL: https://blhidceerkrumgxjhidq.supabase.co
```

## ⚠️ Failure Output

If checks fail, the tool provides specific guidance:

```
✗ SOME CHECKS FAILED

Please review the errors above and fix the configuration.

For help, see:
  - .env.example for configuration template
  - README.md for setup instructions
  - SUPABASE_VERIFICATION_GUIDE.md for troubleshooting
```

## 🔗 Related Commands

```bash
# Supabase verification
npm run verify:supabase      # Verify Supabase connection

# Database detection
npm run detect:db            # Detect database type

# Migrations
npm run migrate              # Apply migrations
npm run migrate:status       # Check migration status

# Supabase CLI
npm run supabase:link        # Link to Supabase project
npm run supabase:status      # Check local status
```

## 📚 Additional Resources

- **[README.md](./README.md)** - Main project documentation
- **[SUPABASE_VERIFICATION_GUIDE.md](./SUPABASE_VERIFICATION_GUIDE.md)** - Detailed verification guide
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase setup guide
- **[SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)** - Migration guide
- **[scripts/README.md](./scripts/README.md)** - Available scripts documentation

## 🆘 Getting Help

If you need assistance:

1. Run the verification tool to see specific errors
2. Check the [SUPABASE_VERIFICATION_GUIDE.md](./SUPABASE_VERIFICATION_GUIDE.md) for solutions
3. Review your Supabase dashboard settings
4. Ensure your `.env` file matches `.env.example` structure

## 🔒 Security Reminders

- ✅ Never commit `.env` file to Git
- ✅ Use anon/public key in `.env`, not service_role key
- ✅ Rotate keys immediately if accidentally exposed
- ✅ Keep GitHub Secrets up to date for CI/CD

---

**Last Updated**: January 2026  
**Tool Location**: `scripts/verify-supabase-connection.cjs`  
**Command**: `npm run verify:supabase`
