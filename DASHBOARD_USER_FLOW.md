# Dashboard User Card Display Flow

## Before Fix (❌ Broken)
```
CSV Import
    ↓
User without 365_username
    ↓
Generate placeholder email: "john.doe.placeholder@local.user"
    ↓
Save to master_user_list table
    ↓
Dashboard.fetchDirectoryUsers()
    ↓
Filter: email.endsWith('@afripipes.co.za') ? ❌ REJECTED
    ↓
User NOT displayed on Dashboard (but shows in Users page)
```

## After Fix (✅ Working)
```
CSV Import
    ↓
User without 365_username
    ↓
Generate placeholder email: "john.doe.placeholder@local.user"
    ↓
Save to master_user_list table
    ↓
Dashboard.fetchDirectoryUsers()
    ↓
Filter: email.endsWith('@afripipes.co.za') OR 
        email.includes('.placeholder@local.user') ? ✅ ACCEPTED
    ↓
User displayed as clickable card on Dashboard
```

## Email Format Examples

### Real M365 Users (Always Accepted)
- `john.doe@afripipes.co.za` ✅
- `jane.smith@afripipes.co.za` ✅

### CSV-Imported Users with 365_username (Always Accepted)
- `john.doe@afripipes.co.za` ✅ (from CSV)

### CSV-Imported Users WITHOUT 365_username (Now Accepted)
- `john.doe.placeholder@local.user` ✅ (generated)
- `jane.smith.placeholder@local.user` ✅ (generated)
- `sn123456.placeholder@local.user` ✅ (from device serial)

### Invalid Emails (Still Rejected)
- `john.doe@otherdomain.com` ❌
- `user@example.com` ❌

## Code Location
File: `src/pages/Dashboard.tsx`
Lines: 306-314 (in `fetchDirectoryUsers` function)

## Related Components
- `CSVUserImporter.tsx` - Generates placeholder emails
- `Users.tsx` - Shows imported users in tabs (different query)
- `master_user_list` table - Stores all imported users
