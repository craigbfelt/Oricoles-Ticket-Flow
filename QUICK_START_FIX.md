# Quick Start Guide - Fix Users Icons List

## 🚨 IMMEDIATE FIX NEEDED

Your users icons list is not showing on the Dashboard because of a security policy that's too restrictive.

## ⚡ Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Click on your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run This SQL
Copy and paste this SQL into the editor and click **Run**:

```sql
-- Fix directory_users RLS policy to allow users to view their own profile
-- This fixes the issue where non-admin users cannot see user icons on the Dashboard

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Staff can view directory users" ON directory_users;

-- Create new policies that allow:
-- 1. Staff (admin/support_staff) to view all directory users
-- 2. Regular users to view their own directory user record by email

CREATE POLICY "Staff can view all directory users" ON directory_users
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can view own directory user by email" ON directory_users
  FOR SELECT TO authenticated
  USING (
    email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );
```

### Step 3: Test It
1. Log in to your Oricol app
2. Go to Dashboard
3. If you're an admin: Click "Users" tab → You should see user icons
4. If you're a regular user: You should see "My Profile" tab

## ✅ Done!

That's it! Your users icons list should now be visible.

## 📝 What About the CSV User Management?

The new CSV-based user management system requires additional setup. See **ACTION_ITEMS_REQUIRED.md** for full details.

In summary:
1. Run the second migration (creates new tables for CSV imports)
2. Prepare your CSV files from RDP/VPN spreadsheets
3. Wait for the CSV import UI to be created (coming soon)

## ❓ Still Having Issues?

Check **ACTION_ITEMS_REQUIRED.md** → Troubleshooting section for common issues and solutions.
