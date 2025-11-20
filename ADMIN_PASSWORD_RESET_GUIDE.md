# Admin Direct Password Reset Implementation

## Overview
This implementation adds the ability for administrators to reset user passwords directly through the system UI, without relying on email delivery.

## Features

### 1. Direct Password Reset (New)
- Admin-only feature
- Sets a new password immediately
- No email required
- Useful when:
  - Email delivery is blocked/unreliable
  - User doesn't have access to their email
  - Immediate password reset is needed

### 2. Email Password Reset (Existing)
- Preserved original functionality
- Sends password reset link via email
- User completes reset themselves
- Maintains user autonomy

## Implementation Details

### Edge Function: `reset-user-password`
**Location**: `supabase/functions/reset-user-password/index.ts`

**Security Features**:
- Validates requesting user is an admin before processing
- Uses Supabase service role client (server-side only)
- Validates user_id format (UUID)
- Enforces minimum password length (6 characters)
- Comprehensive error handling and logging

**API**:
```typescript
POST /reset-user-password
Headers: Authorization: Bearer <admin-jwt-token>
Body: {
  user_id: string (UUID),
  new_password: string (min 6 chars)
}
```

### UI Component: `ResetPasswordDialog`
**Location**: `src/components/ResetPasswordDialog.tsx`

**Features**:
- Password input with show/hide toggle
- Password confirmation field
- Client-side validation
- Clear error messages
- Success feedback

### Users Page Updates
**Location**: `src/pages/Users.tsx`

**Changes**:
- Added `handleResetPasswordDirect()` - Opens password reset dialog
- Renamed `handleResetPassword()` to `handleResetPasswordEmail()` - Existing email functionality
- Two separate buttons in UI:
  - "Reset Password Directly" - New direct reset
  - "Send Reset Email" - Original email reset
- Both buttons only visible to admins

## Usage

### For Administrators

1. Navigate to **Users** page
2. Click on a system user to view details
3. Two password reset options will appear:
   - **Reset Password Directly**: Opens a dialog to set a new password immediately
   - **Send Reset Email**: Sends a password reset link to the user's email

### Direct Reset Process
1. Click "Reset Password Directly"
2. Enter new password (minimum 6 characters)
3. Confirm password
4. Click "Reset Password"
5. User can immediately log in with the new password

### Email Reset Process
1. Click "Send Reset Email"
2. User receives email with reset link
3. User clicks link and sets their own password

## Security Considerations

### Authentication & Authorization
- Only users with the `admin` role can reset passwords
- Admin status is verified server-side in the edge function
- JWT token is validated before processing

### Password Security
- Minimum 6 characters enforced (Supabase default)
- Password confirmation required to prevent typos
- Passwords transmitted over HTTPS only
- Service role key never exposed to client

### Audit Trail
- Password reset events are logged by Supabase Auth
- Edge function logs admin actions
- Can be monitored through Supabase dashboard

## Testing Checklist

- [ ] Non-admin users cannot see password reset buttons
- [ ] Direct password reset dialog opens correctly
- [ ] Password validation works (minimum 6 characters)
- [ ] Password confirmation validation works
- [ ] Successful password reset shows confirmation
- [ ] User can log in with new password immediately
- [ ] Email reset still works as before
- [ ] Error handling works correctly
- [ ] Edge function rejects non-admin requests

## Deployment

### Edge Function Configuration
**IMPORTANT**: The edge function is configured in `supabase/config.toml` with `verify_jwt = true` to require authentication. This configuration is required for the function to work properly.

### Edge Function Deployment

#### On Lovable Platform
Edge functions are automatically deployed when changes are pushed to the repository. No manual deployment is needed.

#### Using Supabase CLI (Manual Deployment)
If deploying manually or using local Supabase:

```bash
# Using Supabase CLI
npx supabase functions deploy reset-user-password

# Or deploy all functions
npx supabase functions deploy
```

### Environment Variables Required
The edge function uses these environment variables (automatically available in Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Rollback Plan

If issues arise, the feature can be safely disabled by:

1. **UI Level**: Comment out the "Reset Password Directly" button in Users.tsx
2. **Function Level**: Remove or disable the edge function
3. **Revert**: The email reset functionality remains unchanged and will continue working

## Future Enhancements

Potential improvements:
- Password strength requirements (uppercase, numbers, special chars)
- Password history tracking (prevent reuse)
- Notification to user when admin resets their password
- Audit log visible in UI
- Bulk password reset capability
- Temporary password generation option

## Support

### Troubleshooting

**Error: "Can't send the edge function"**
- **Cause**: The edge function is not configured or deployed
- **Solution**: Ensure `supabase/config.toml` contains the `[functions.reset-user-password]` section with `verify_jwt = true`
- **On Lovable**: The function auto-deploys when config changes are pushed

For other issues or questions:
1. Check Supabase Edge Function logs in the Supabase Dashboard
2. Check browser console for client-side errors
3. Verify admin role is properly assigned to your user
4. Ensure edge function is deployed and configured
