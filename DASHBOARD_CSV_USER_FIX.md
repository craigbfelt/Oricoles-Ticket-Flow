# Dashboard CSV User Display Fix

## Problem
After CSV import, users were showing up in the Users page tabs but not appearing as clickable cards on the main Dashboard page.

## Root Cause
The Dashboard's `fetchDirectoryUsers()` function was filtering users to only include those with `@afripipes.co.za` email domain. However, CSV-imported users without a `365_username` field get assigned placeholder emails with the format:
```
{name}.placeholder@local.user
```

These placeholder emails were being filtered out, preventing the users from appearing on the dashboard.

## Solution
Updated the filtering logic in `src/pages/Dashboard.tsx` (line 306-314) to accept both:
1. Real M365 users with `@afripipes.co.za` domain
2. CSV-imported users with `.placeholder@local.user` emails

### Code Change
```typescript
// Before
if (!email.endsWith('@afripipes.co.za')) {
  return;
}

// After
const isAfripipesDomain = email.endsWith('@afripipes.co.za');
const isPlaceholderEmail = email.includes('.placeholder@local.user');

if (!isAfripipesDomain && !isPlaceholderEmail) {
  return;
}
```

## How to Verify the Fix
1. Import users via CSV without providing `365_username` for some users
2. Navigate to the main Dashboard page
3. Click on the "Users" tab
4. Verify that user cards are now displaying for all imported users, including those with placeholder emails
5. Click on a user card to view their details

## Related Files
- `src/pages/Dashboard.tsx` - Main dashboard with user cards display
- `src/components/CSVUserImporter.tsx` - CSV import logic with placeholder email generation
- `supabase/migrations/20251209103000_create_csv_user_management_schema.sql` - Database schema for master_user_list

## Notes
- Placeholder emails are generated for users who don't have a `365_username` field in the CSV
- These users will still show up correctly on the Users page because that page queries different tables
- The Dashboard specifically needed this fix because it filters by email domain
