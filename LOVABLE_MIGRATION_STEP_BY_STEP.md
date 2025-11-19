# 🎯 Using the Migration Manager on Lovable - Step by Step Guide

## ✅ What You Have Now

The Oricol Dashboard now includes a **SimpleMigrationManager** that works perfectly on Lovable without requiring any edge function deployment!

## 📍 Where to Find It

1. Open your **Oricol Helpdesk** application on Lovable
2. Log in to your account
3. Go to the **Dashboard** page
4. Look for the card titled **"Database Migrations (Manual Mode)"**

## 🚀 How to Use It - Complete Walkthrough

### Step 1: Check Migration Status

When you first open the Dashboard, the Migration Manager will automatically check your database to see which migrations have been applied.

You'll see:
- ✅ **Applied**: Migrations that are already in your database
- ⚠️ **Pending**: Migrations that need to be applied

Click the **"Refresh"** button anytime to update the status.

### Step 2: Apply a Pending Migration

If you have pending migrations, here's what to do:

#### 2.1 Click on a Pending Migration
- In the migration list, click on any migration marked as "Pending"
- This will expand to show detailed instructions

#### 2.2 Get the SQL Code
You'll see a button: **"View SQL on GitHub"**
- Click this button to open the migration file on GitHub
- The SQL code will open in a new tab
- Select all the SQL (Ctrl+A or Cmd+A)
- Copy it (Ctrl+C or Cmd+C)

**Alternative**: Click **"Copy URL"** to copy the GitHub link

#### 2.3 Open Supabase SQL Editor
Click the **"Open Supabase SQL Editor"** button
- This opens your Supabase project's SQL Editor in a new tab
- You may need to log in to Supabase if you're not already

#### 2.4 Run the Migration
1. In Supabase SQL Editor, click **"New Query"**
2. Paste the SQL you copied from GitHub (Ctrl+V or Cmd+V)
3. Click **"Run"** (or press F5)
4. Wait for it to complete - you should see "Success" at the bottom

#### 2.5 Mark the Migration as Applied
Back in the Migration Manager, you'll see **"Step 3: Mark as applied"** section with some SQL.

Click the **"Copy 'Mark as Applied' SQL"** button, then:
1. Go back to Supabase SQL Editor
2. Click "New Query" again
3. Paste this SQL
4. Click "Run"

This records that the migration has been applied so you don't run it again.

#### 2.6 Refresh the Status
Back in your Oricol Dashboard:
1. Click the **"Refresh"** button in the Migration Manager
2. The migration you just applied should now show as "Applied" ✅

### Step 3: Repeat for All Pending Migrations

Apply migrations **in order** (oldest first). The list is already sorted chronologically, so just work from top to bottom.

## 💡 Pro Tips

### If You Have Many Pending Migrations

You can apply multiple migrations at once:
1. Open each migration file on GitHub
2. Copy ALL the SQL from multiple files into one big text
3. Paste and run them all together in Supabase SQL Editor
4. Then mark each one as applied (or run the mark-as-applied SQL for all of them)

### If the schema_migrations Table Doesn't Exist

The first time you use this system, you need to create the tracking table:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
```

Run this in Supabase SQL Editor before applying any migrations.

### Checking Your Supabase Project ID

The "Open Supabase SQL Editor" button tries to detect your project ID automatically from the app's configuration. If it doesn't work:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Look at the URL - it will be: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/`
4. Your SQL Editor is at: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`

## 📋 Example: Applying Your First Migration

Let's say you have a pending migration: `20251108052000_bee9ee20-5a81-402a-bdd9-30cce8e8ecb7.sql`

1. **In Oricol Dashboard**: Click on the migration in the list
2. **Get SQL**: Click "View SQL on GitHub" → Copy all the SQL
3. **Open Supabase**: Click "Open Supabase SQL Editor" 
4. **Run Migration**: New Query → Paste SQL → Run
5. **Mark Applied**: Copy the "mark as applied" SQL → New Query → Paste → Run
6. **Verify**: Click "Refresh" in Migration Manager → Should now show as "Applied" ✅

## ❓ Troubleshooting

### "Failed to check migration status"

This means the Migration Manager can't connect to your database. Check:
- Are you logged into the Oricol app?
- Is your Supabase configuration correct in the app?
- Do you have internet connection?

### "Table schema_migrations does not exist"

Create it first:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
```

### Migration SQL Fails When Running

Common reasons:
- **Table already exists**: The migration might have already been partially applied. Check if you can just mark it as applied.
- **Dependency missing**: You need to apply earlier migrations first. Go in chronological order.
- **Syntax error**: The SQL might have special characters. Make sure you copied everything correctly.

### "Refresh" Button Doesn't Update Status

- Wait a few seconds and try again
- Clear your browser cache
- Check the browser console (F12) for error messages

## 🎉 You're All Set!

The SimpleMigrationManager makes it easy to keep your Lovable database in sync with your GitHub repository's migrations, all through a simple point-and-click interface with clear instructions.

No CLI, no edge functions, no complex setup - just copy, paste, and you're done! 🚀

---

**Need Help?** Check the browser console (F12) for detailed error messages, or contact support.
