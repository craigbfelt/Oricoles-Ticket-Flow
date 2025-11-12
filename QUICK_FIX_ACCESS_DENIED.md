# Quick Fix for "Access Denied" Issue

## Problem
`craig@zerobitone.co.za` gets "Access Denied" when clicking on tabs like Reports, Users, VPN, RDP, etc.

## Instant Fix (Choose ONE method)

### Method 1: Apply Migration (Recommended)

**If using Supabase Cloud:**
1. Go to https://supabase.com
2. Open your project
3. Click **SQL Editor** in sidebar
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Fix for craig@zerobitone.co.za access denied issue
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
INNER JOIN auth.users au ON p.user_id = au.id
WHERE au.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;
```

6. Click **Run** (or press Ctrl+Enter)
7. **Done!** Log out and log back in to test

**If using Local Supabase:**
```bash
# Apply all migrations
npx supabase db reset
```

### Method 2: Manual Role Assignment

1. Go to Supabase Dashboard → **Table Editor**
2. Open `profiles` table
3. Find row where `email` = `craig@zerobitone.co.za`
4. Copy the `user_id` (UUID)
5. Open `user_roles` table
6. Click **Insert row**
7. Fill in:
   - `user_id`: [paste UUID from step 4]
   - `role`: Select `admin`
8. Click **Save**
9. **Done!** Log out and log back in to test

## Verify the Fix

Run this in SQL Editor to check:

```sql
SELECT 
  p.email,
  ARRAY_AGG(ur.role::TEXT ORDER BY ur.role) as roles
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.email = 'craig@zerobitone.co.za'
GROUP BY p.email;
```

Expected result:
```
email                   | roles
------------------------+------------------
craig@zerobitone.co.za | {admin, user}
```

## Test

After applying the fix:
1. **Log out** completely
2. **Log back in** as craig@zerobitone.co.za
3. Click on these tabs - all should work:
   - ✅ Reports
   - ✅ Users
   - ✅ VPN
   - ✅ RDP
   - ✅ Jobs
   - ✅ Maintenance
   - ✅ Remote Support

## Still Not Working?

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. Try in **Incognito/Private window**
3. Check [FIXING_ACCESS_DENIED.md](./FIXING_ACCESS_DENIED.md) for detailed troubleshooting

## Prevention

These emails automatically get admin role on signup:
- craig@zerobitone.co.za
- admin@oricol.co.za
- admin@zerobitone.co.za

For new admin accounts, use one of these emails or manually assign the role after signup.
