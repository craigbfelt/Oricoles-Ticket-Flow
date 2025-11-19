# How to Apply the User Profile Fix Migration on Lovable

## Problem
Users are experiencing a "user not found error" when trying to view or add tickets. This happens when a user can authenticate (log in) but doesn't have a profile record in the database.

## Solution
A migration has been created to fix this issue: `20251119055823_backfill_missing_profiles.sql`

## Applying the Migration on Lovable (No CLI Required)

### Step 1: Open Supabase SQL Editor
1. Go to your Lovable project dashboard
2. Click on **Database** in the sidebar
3. Click on **SQL Editor** tab

### Step 2: Run the Migration
1. Click the **New query** button
2. Copy the entire contents of `supabase/migrations/20251119055823_backfill_missing_profiles.sql`
3. Paste it into the SQL editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Step 3: Verify the Fix
After running the migration, you should see:
- ✅ "Success. No rows returned" - This is normal and means it executed successfully
- ✅ All existing auth users now have profile records
- ✅ The `handle_new_user()` trigger has been updated with better error handling

### Step 4: Test
1. Try logging in with an existing user account
2. Navigate to the Tickets page
3. You should now be able to view and add tickets without errors

## What This Migration Does

1. **Backfills Missing Profiles**: Creates profile records for any auth users who don't have one
2. **Improves Trigger**: Updates the `handle_new_user()` trigger to:
   - Handle race conditions with `ON CONFLICT` clause
   - Prevent failures with error handling
   - Log warnings instead of failing user creation

## Troubleshooting

### "User profile not found" error persists
1. Check if the migration ran successfully
2. Verify your user exists in auth.users table:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```
3. Check if a profile was created:
   ```sql
   SELECT * FROM public.profiles WHERE user_id = 'user-id-from-above';
   ```
4. If no profile exists, manually create one:
   ```sql
   INSERT INTO public.profiles (user_id, email, full_name)
   SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', '') 
   FROM auth.users 
   WHERE email = 'your-email@example.com';
   ```

### Need More Help?
- Check the Supabase logs in the Lovable dashboard
- Review the [LOVABLE_SQL_EDITING_GUIDE.md](./LOVABLE_SQL_EDITING_GUIDE.md) for general SQL editing help
- Contact support with the error details

## Prevention

Going forward, the updated `handle_new_user()` trigger will:
- Automatically create profiles for new signups
- Handle errors gracefully without failing user creation
- Log warnings for debugging

The Tickets.tsx page has also been updated to automatically create a profile if one is missing when a user tries to access the page.
