# Migration and Security Fix Guide

This document explains how to apply the pending migrations for the Shared Files feature and verify that no one exploited the privilege escalation vulnerability.

## Overview

Three main tasks need to be completed:

1. **Apply Pending Migrations** - Create tables for the Shared Files system
2. **Fix XSS Vulnerability** - Already fixed in route-ticket-email edge function
3. **Verify Admin Role Assignments** - Check for unauthorized admin access

---

## 1. Apply Pending Migrations

### Tables Created

The following migrations will create these tables:

#### Already Applied (Migration: 20251116134400)
- ✅ `user_groups` - User groups for organizing users
- ✅ `user_group_members` - Junction table for user group membership

#### Needs to be Applied (Migration: 20251117000000)
- ⏳ `shared_folders` - Folder structure for organizing shared files
- ⏳ `shared_folder_files` - Files stored in shared folders  
- ⏳ `shared_folder_permissions` - Permissions for accessing shared folders (formerly called `folder_permissions`)

### How to Apply Migrations

#### Option 1: Using the Quick Apply Script (Recommended)

```bash
npm run migrate
# or
bash scripts/apply-migrations.sh
```

This script will:
1. Check for Supabase CLI
2. Link to your Supabase project (project ID: kwmeqvrmtivmljujwocp)
3. Show migration status
4. Apply all pending migrations with `supabase db push`

#### Option 2: Using npm Scripts

```bash
# Check migration status
npm run migrate:status

# Apply migrations
npm run migrate:apply
```

#### Option 3: Manual Application via Supabase CLI

```bash
# Link to project (if not already linked)
npx supabase link --project-ref kwmeqvrmtivmljujwocp

# Check which migrations are pending
npx supabase migration list

# Apply migrations
npx supabase db push
```

#### Option 4: Manual Application via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251117000000_create_shared_files_system.sql`
4. Paste and run the SQL

### Verify Migration Success

After applying migrations, verify the tables were created:

```sql
-- Run this in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'shared_folders',
  'shared_folder_files', 
  'shared_folder_permissions',
  'user_groups',
  'user_group_members'
)
ORDER BY table_name;
```

You should see all 5 tables listed.

---

## 2. XSS Vulnerability Fix

### Status: ✅ FIXED

The XSS vulnerability in the `route-ticket-email` edge function has been fixed.

### What Was Fixed

**File:** `supabase/functions/route-ticket-email/index.ts`

**Problem:** User-supplied data (description, branch, faultType, errorCode, priority) was embedded directly into HTML email templates without escaping, allowing potential XSS attacks.

**Solution:** 
- Added `escapeHtml()` function to sanitize all user inputs
- Applied HTML escaping to all user-supplied fields before embedding in email HTML
- Properly handles undefined/null values

### Changes Made

```typescript
// Added HTML escaping function
function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Applied to all user inputs in email templates
${escapeHtml(description)}
${escapeHtml(branch)}
${escapeHtml(faultType)}
${escapeHtml(errorCode)}
${escapeHtml(priority?.toUpperCase())}
```

### Deployment

The edge function changes need to be deployed to Supabase:

```bash
# Deploy the updated edge function
npx supabase functions deploy route-ticket-email
```

Or deploy via Supabase Dashboard:
1. Go to Edge Functions in your Supabase project
2. Update the `route-ticket-email` function
3. Deploy the changes

---

## 3. Verify Admin Role Assignments

### Status: ⚠️ REQUIRES VERIFICATION

A privilege escalation vulnerability was fixed in migration `20251117102836_e9e402df-9138-41a1-874c-39dc729c3cbd.sql`. This vulnerability allowed any authenticated user to grant themselves admin role due to overly permissive RLS policies.

### How to Verify

#### Run the Verification Query

A verification query file has been created at:
`supabase/migrations/verify_admin_roles.sql`

**Option 1: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/sql
2. Open the SQL Editor
3. Copy and paste the contents of `verify_admin_roles.sql`
4. Run the query

**Option 2: Via CLI**
```bash
npx supabase db execute --file supabase/migrations/verify_admin_roles.sql
```

### What to Look For

The query will show all users with admin role assignments:
- Email address
- User ID  
- Role assigned date
- Days since assignment

**Red Flags:**
- Admin roles assigned to unfamiliar users
- Multiple admin assignments around the same time
- Recent admin assignments you don't recognize
- Admin roles for users who shouldn't have admin access

### If You Find Unauthorized Admins

Revoke unauthorized admin access immediately:

```sql
-- Replace <unauthorized_user_id> with the actual user ID
DELETE FROM public.user_roles 
WHERE user_id = '<unauthorized_user_id>' 
AND role = 'admin';
```

### Additional Security Check

Check for suspicious patterns (multiple admin assignments in short time):

```sql
SELECT 
  DATE_TRUNC('hour', created_at) as assignment_hour,
  COUNT(*) as admin_assignments_in_hour
FROM public.user_roles
WHERE role = 'admin'
GROUP BY DATE_TRUNC('hour', created_at)
HAVING COUNT(*) > 1
ORDER BY assignment_hour DESC;
```

---

## Summary Checklist

- [ ] Apply pending migrations using `npm run migrate` or `supabase db push`
- [ ] Verify tables created: shared_folders, shared_folder_files, shared_folder_permissions
- [ ] Deploy updated route-ticket-email edge function (XSS fix already in code)
- [ ] Run admin verification query from `verify_admin_roles.sql`
- [ ] Review admin role assignments for unauthorized access
- [ ] Revoke any unauthorized admin roles if found
- [ ] Document any security incidents discovered

---

## Need Help?

- **Supabase Dashboard:** https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp
- **Migration Documentation:** See SUPABASE_MIGRATIONS.md
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
