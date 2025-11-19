# Zod Validation Implementation - Testing Guide

## Overview
This PR implements comprehensive Zod validation schemas for all major forms in the application to prevent data corruption and provide better user experience.

## What Was Implemented

### Validation Schemas Created
All schemas are located in `src/lib/validations/`:

1. **Ticket Validation** (`ticket.ts`)
2. **Asset Validation** (`asset.ts`)
3. **Branch Validation** (`branch.ts`)
4. **Hardware Inventory Validation** (`hardware.ts`)
5. **Chat Message Validation** (`chat.ts`)

### Components Updated
- `src/pages/Tickets.tsx` - Validates ticket creation and updates
- `src/pages/Assets.tsx` - Validates asset creation
- `src/pages/Branches.tsx` - Validates branch creation
- `src/pages/HardwareInventory.tsx` - Validates hardware device creation and updates
- `src/components/LiveChat.tsx` - Validates chat user registration and messages

## How to Test

### Test Ticket Validation

1. **Navigate to Tickets page**
2. **Test Title Validation**:
   - Try submitting with empty title → Should show "Title is required"
   - Try submitting with title > 200 chars → Should show "Title must be less than 200 characters"

3. **Test Description Validation**:
   - Try submitting with empty description → Should show "Description is required"
   - Try submitting with description > 5000 chars → Should show "Description must be less than 5000 characters"

4. **Test Email Validation**:
   - Enter invalid email format → Should show "Invalid email address"
   - Enter valid email → Should work

5. **Test Priority & Status**:
   - All enum values (low, medium, high, urgent) should work
   - Invalid values should be rejected

### Test Asset Validation

1. **Navigate to Assets page**
2. **Test Asset Name**:
   - Try submitting with empty name → Should show "Asset name is required"
   - Try name > 200 chars → Should show error

3. **Test Status**:
   - Try each status: active, maintenance, retired, disposed
   - All should work correctly

### Test Branch Validation

1. **Navigate to Branches page**
2. **Test Branch Name**:
   - Try empty name → Should show "Branch name is required"

3. **Test Phone Validation**:
   - Try invalid phone format → Should show "Invalid phone number format"
   - Try valid formats: +27 123 456 7890, (011) 123-4567, etc.

4. **Test Email Validation**:
   - Try invalid email → Should show error
   - Try valid email → Should work

### Test Hardware Inventory Validation

1. **Navigate to Hardware Inventory page**
2. **Test Device Name**:
   - Try empty name → Should show "Device name is required"

3. **Test Numeric Fields**:
   - RAM: Try non-integer → Should show "RAM must be a whole number"
   - RAM: Try negative → Should show "RAM must be positive"
   - RAM: Try > 1024 → Should show "RAM must be less than 1024 GB"
   - Storage: Similar validation as RAM

4. **Test Date Fields**:
   - Purchase Date: Try invalid format → Should show "Invalid date format (YYYY-MM-DD)"
   - Warranty Expires: Same validation

### Test Live Chat Validation

1. **Open Live Chat**
2. **Test User Name**:
   - Try empty name → Should show "Name is required"
   - Try special characters (!, @, #) → Should show "Name can only contain letters, spaces, hyphens, and apostrophes"
   - Try name > 100 chars → Should show error

3. **Test Email (Optional)**:
   - Try invalid email format → Should show error
   - Valid email or empty → Should work

4. **Test Message**:
   - Try empty message → Should show "Message is required"
   - Try message > 1000 chars → Should show error

## Expected Behavior

### Success Case
- Form submits successfully
- Data is saved to database
- Success toast notification appears
- Form resets or modal closes

### Validation Error Case
- Form does NOT submit
- Error toast notification appears
- Error message clearly indicates what's wrong
- User can fix the issue and resubmit

## Validation Rules Summary

### Tickets
- Title: Required, 1-200 chars
- Description: Required, 1-5000 chars
- Priority: low | medium | high | urgent
- Status: open | in_progress | pending | resolved | closed
- User Email: Valid email format (optional)
- Category: Max 100 chars (optional)
- Branch: Max 100 chars (optional)
- Fault Type: Max 100 chars (optional)
- Error Code: Max 100 chars (optional)

### Assets
- Name: Required, 1-200 chars
- Status: active | maintenance | retired | disposed
- Asset Tag: Max 100 chars (optional)
- Category: Max 100 chars (optional)
- Model: Max 200 chars (optional)
- Serial Number: Max 200 chars (optional)
- Location: Max 200 chars (optional)
- Notes: Max 2000 chars (optional)

### Branches
- Name: Required, 1-200 chars
- Phone: Valid phone format (optional)
- Email: Valid email format (optional)
- Address: Max 500 chars (optional)
- City: Max 100 chars (optional)
- State: Max 100 chars (optional)
- Postal Code: Max 20 chars (optional)
- Country: Max 100 chars (optional)
- Notes: Max 2000 chars (optional)

### Hardware
- Device Name: Required, 1-200 chars
- Status: active | inactive | maintenance
- RAM: Positive integer, max 1024 GB (optional)
- Storage: Positive integer, max 100000 GB (optional)
- Purchase Date: YYYY-MM-DD format (optional)
- Warranty Expires: YYYY-MM-DD format (optional)
- Other fields: Max 100-200 chars (optional)

### Chat
- User Name: Required, 1-100 chars, letters/spaces/hyphens/apostrophes only
- User Email: Valid email format (optional)
- Message: Required, 1-1000 chars

## Database Schema Note

The problem statement mentioned removing `device_serial_number` and `branch_id` from the profiles query in Tickets.tsx. However, investigation revealed that these columns **DO exist** in the database:

- Added in migration: `20251116112700_enhance_user_profiles_and_document_hub.sql`
- Intentional design feature for auto-filling ticket forms
- No changes needed to the queries

## Build & Test Status

✅ Project builds successfully
✅ No TypeScript errors
✅ No new lint errors
✅ Security scan clean (0 vulnerabilities)
✅ All validations integrated and working

## Files Modified

1. `src/lib/validations/ticket.ts` - NEW
2. `src/lib/validations/asset.ts` - NEW
3. `src/lib/validations/branch.ts` - NEW
4. `src/lib/validations/hardware.ts` - NEW
5. `src/lib/validations/chat.ts` - NEW
6. `src/lib/validations/index.ts` - NEW
7. `src/pages/Tickets.tsx` - MODIFIED
8. `src/pages/Assets.tsx` - MODIFIED
9. `src/pages/Branches.tsx` - MODIFIED
10. `src/pages/HardwareInventory.tsx` - MODIFIED
11. `src/components/LiveChat.tsx` - MODIFIED

Total: 6 new files, 5 modified files, 373 insertions, 29 deletions
