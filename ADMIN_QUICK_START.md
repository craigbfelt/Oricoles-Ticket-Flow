# Quick Reference: New Admin Account

## ⚡ TL;DR - Create Admin Account Now

### Step 1: Go to Supabase Dashboard
🔗 https://supabase.com → Your Project → Authentication → Users

### Step 2: Create User
- Click **"Add user"** → **"Create user"**
- **Email:** `admin@oricol.co.za`
- **Password:** Your strong password (min 12 chars)
- ✓ Check **"Auto Confirm User"**
- Click **"Create user"**

### Step 3: Login
- Go to your app URL
- Login with: `admin@oricol.co.za` / your password
- ✅ Done! You now have full admin access

## ✅ Verify It Works

After login, check that you can see **"Users"** in the sidebar menu.
- If YES → You have admin access! ✅
- If NO → See troubleshooting below ⚠️

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| `ADMIN_ACCOUNT_SETUP.md` | Complete setup guide (all deployment methods) |
| `ADMIN_PERMISSIONS_VERIFICATION.md` | Test all admin permissions (detailed checklist) |
| `IMPLEMENTATION_SUMMARY.md` | Technical details of what was implemented |

## 🔐 Admin Permissions

Admin role gives you access to:
- ✅ **All 20+ pages** in the application
- ✅ **Users page** (admin-only, most important)
- ✅ Full CRUD on tickets, assets, inventory
- ✅ Manage user roles and permissions
- ✅ Access VPN/RDP credentials
- ✅ View all reports and analytics

## 🎯 Pre-Configured Admin Emails

These emails automatically get admin role on signup:
1. `craig@zerobitone.co.za` (original admin)
2. `admin@oricol.co.za` (new admin - **recommended**)

## ⚠️ Troubleshooting

### Can't see "Users" in menu?

Run this in Supabase SQL Editor:
```sql
SELECT au.email, string_agg(ur.role::text, ', ') as roles
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE au.email = 'admin@oricol.co.za'
GROUP BY au.email;
```

Should show: `admin@oricol.co.za | admin, user`

If missing admin role, run:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@oricol.co.za'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Getting "Access Denied"?

1. Log out completely
2. Clear browser cache/cookies
3. Log back in
4. Should work now

## 🔒 Security Tips

✅ Use strong password (12+ chars, letters+numbers+symbols)
✅ Change password after first login
✅ Don't share admin credentials
✅ Use CEO or support_staff roles for others who need elevated access

## 🆘 Need More Help?

See `ADMIN_ACCOUNT_SETUP.md` for:
- Local development setup
- Supabase CLI method
- Detailed troubleshooting
- Security best practices

---

**Created by:** Oricol Helpdesk Admin Account Setup Migration
**Migration:** `20251112170113_create_new_admin_account.sql`
**Date:** November 12, 2024
