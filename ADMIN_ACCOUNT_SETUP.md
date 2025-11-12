# Admin Account Setup Guide

## Creating a New Admin Account

If you cannot access your existing admin account, follow these steps to create a new admin account with full permissions.

### Recommended Admin Account Email
**Email:** `admin@oricol.co.za`

This email is pre-configured in the system to automatically receive admin privileges when the account is created.

## Setup Options

### Option 1: Using Supabase Dashboard (Recommended for Cloud Deployment)

1. **Log in to Supabase Dashboard**
   - Go to [https://supabase.com](https://supabase.com)
   - Navigate to your project

2. **Navigate to Authentication**
   - Click on "Authentication" in the left sidebar
   - Click on "Users" tab

3. **Create New User**
   - Click "Add user" button
   - Select "Create user"
   - Fill in the details:
     - **Email:** `admin@oricol.co.za`
     - **Password:** Choose a strong password (recommended: at least 12 characters with mix of letters, numbers, and symbols)
     - **Auto Confirm User:** ✓ (checked)
   - Click "Create user"

4. **Apply Database Migration**
   - The migration `20251112170113_create_new_admin_account.sql` will automatically:
     - Create a profile for the user
     - Assign admin role
     - Assign user role (default for all users)

5. **Verify Admin Access**
   - Log in to the application with the new credentials
   - Verify you can access all pages, especially:
     - Dashboard
     - Tickets
     - Remote Support
     - Jobs
     - Maintenance
     - Logistics
     - Assets
     - Branches
     - Microsoft 365
     - Hardware
     - Software
     - Licenses
     - Provider Emails
     - VPN
     - RDP
     - Reports
     - **Users** (Admin only - critical test)

### Option 2: Using Local Supabase (Docker)

If you're running Supabase locally with Docker:

1. **Start Supabase**
   ```bash
   npx supabase start
   ```

2. **Access Supabase Studio**
   - Open http://localhost:54323 in your browser
   - This is your local Supabase Studio

3. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users"

4. **Add New User**
   - Click "Add user" → "Create user"
   - Email: `admin@oricol.co.za`
   - Password: Your secure password
   - Auto Confirm User: ✓
   - Click "Create user"

5. **Apply Migrations**
   ```bash
   npx supabase db reset
   ```
   This will apply all migrations including the new admin account setup.

6. **Start the Application**
   ```bash
   npm run dev
   ```

7. **Log In**
   - Navigate to http://localhost:8080
   - Use credentials: `admin@oricol.co.za` / your password

### Option 3: Using Supabase CLI

For advanced users who prefer command-line:

```bash
# Using supabase CLI to create user via SQL
npx supabase db reset

# Or manually via psql if you have direct database access
# (This requires superuser access and is not recommended)
```

## Admin Permissions

The admin role has access to:

### Full Access Pages
- ✅ Dashboard
- ✅ Tickets (view all, create, update, delete)
- ✅ Remote Support
- ✅ Jobs
- ✅ Maintenance
- ✅ Logistics
- ✅ Assets (full CRUD operations)
- ✅ Branches
- ✅ Microsoft 365
- ✅ Hardware Inventory
- ✅ Software Inventory
- ✅ Licenses
- ✅ Provider Emails
- ✅ VPN Credentials (view and manage)
- ✅ RDP Credentials (view and manage)
- ✅ Reports
- ✅ **Users** (System Users management - Admin ONLY)

### Database Permissions (via RLS Policies)
- ✅ View all profiles
- ✅ View, create, update, delete tickets
- ✅ View, create, update, delete assets
- ✅ View and create comments on all tickets
- ✅ Assign and manage user roles

## Pre-Configured Admin Emails

The following emails are automatically assigned admin role on account creation:

1. `craig@zerobitone.co.za` - Original admin
2. `admin@oricol.co.za` - New admin account

## Alternative Admin Accounts

If you need to create a different admin account:

1. Create the user account through Supabase dashboard
2. Manually assign the admin role via SQL:

```sql
-- Replace 'YOUR_USER_ID' with the actual user UUID
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

## Security Best Practices

1. **Change Default Password Immediately**
   - After first login, go to user settings and change password
   
2. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words or patterns

3. **Enable 2FA (If Available)**
   - Check Supabase authentication settings for MFA options

4. **Regular Password Updates**
   - Change admin password every 90 days

5. **Limit Admin Access**
   - Only grant admin role to users who absolutely need it
   - Use support_staff or ceo roles for users who need most access but not user management

## Troubleshooting

### Cannot See Users Page
**Problem:** Logged in but "Users" option not visible in sidebar

**Solution:** 
- Verify admin role is assigned by checking `user_roles` table
- Run this SQL query in Supabase SQL Editor:
```sql
SELECT ur.role, p.email, p.full_name
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = auth.uid();
```

### Permission Denied Errors
**Problem:** Getting "Access Denied" messages on certain pages

**Solution:**
- Verify the user has the admin role in the database
- Log out and log back in to refresh permissions
- Check browser console for any errors

### Cannot Delete or Modify Users
**Problem:** Can view Users page but cannot modify roles

**Solution:**
- Only admin role can modify user roles
- CEO role can view but not edit system users
- Check RLS policies are correctly configured

## Support

If you continue to have issues accessing admin features:

1. Check migration was applied: Look for `20251112170113_create_new_admin_account.sql` in applied migrations
2. Verify user exists in auth.users table
3. Verify role exists in user_roles table
4. Check application logs for any errors
5. Contact the development team with specific error messages

## Role Hierarchy

For reference, here's the complete role structure:

- **admin** - Full access to everything including System Users management
- **ceo** - Full access to everything EXCEPT System Users management  
- **support_staff** - Access to most features except Assets and System Users
- **user** - Basic access to Tickets and Remote Support only

All users automatically get the 'user' role in addition to any elevated roles they may have.
