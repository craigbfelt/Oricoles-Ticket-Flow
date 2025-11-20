# Fix: Reset User Password Edge Function

## Problem
When trying to use the "Reset Password Directly" feature in the Users page, the function fails with an error: "can't send the edge function".

## Root Cause
The `reset-user-password` edge function was implemented but not configured in `supabase/config.toml`. Without this configuration entry, the function cannot be properly deployed or accessed, especially on the Lovable platform where edge functions are auto-deployed based on the config file.

## Solution
Added the missing configuration entry to `supabase/config.toml`:

```toml
[functions.reset-user-password]
verify_jwt = true  # SECURITY: Require authentication for password reset operations
```

## What This Fix Does
1. **Enables Edge Function Deployment**: The function is now recognized by Supabase's deployment system
2. **Adds JWT Verification**: Ensures only authenticated admin users can call the function
3. **Matches Other Functions**: Uses the same security pattern as all other edge functions in the project

## Verification
After this fix is deployed (automatic on Lovable):
1. Navigate to Users page as an admin
2. Click on a user to view details
3. Click "Reset Password Directly" button
4. Enter a new password and confirm
5. The password should be reset successfully

## Technical Details

### Files Changed
- `supabase/config.toml` - Added edge function configuration
- `ADMIN_PASSWORD_RESET_GUIDE.md` - Updated deployment documentation

### Edge Function Implementation
The edge function itself (`supabase/functions/reset-user-password/index.ts`) was already correctly implemented with:
- Admin role verification
- Password validation (minimum 6 characters)
- Secure password update using Supabase Admin API
- Comprehensive error handling

### Related Files
- `src/components/ResetPasswordDialog.tsx` - UI component for password reset
- `src/pages/Users.tsx` - Users page with reset password buttons
- `supabase/functions/reset-user-password/index.ts` - Edge function implementation

## Deployment Notes

### On Lovable Platform
- Edge functions auto-deploy when changes are pushed to the repository
- No manual intervention required
- Function will be available immediately after merge

### Manual Deployment (if needed)
```bash
npx supabase functions deploy reset-user-password
```

## Security Considerations
- The `verify_jwt = true` setting ensures only authenticated users can call the function
- The edge function itself verifies the user has admin role before processing
- Passwords are never logged or exposed in responses
- All password updates use Supabase's secure Admin API

## See Also
- [ADMIN_PASSWORD_RESET_GUIDE.md](./ADMIN_PASSWORD_RESET_GUIDE.md) - Complete guide for using the password reset feature
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
