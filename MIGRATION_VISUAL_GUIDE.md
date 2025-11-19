# 🖼️ Visual Guide: What You'll See in the Migration Manager

## When You First Open the Dashboard

You'll see a card that looks like this:

```
┌─────────────────────────────────────────────────────────────┐
│ 🗄️ Database Migrations (Manual Mode)          [🔄 Refresh] │
│ Copy & paste SQL into Supabase SQL Editor                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ 45 Applied    ⚠️ 16 Pending                              │
│                                                              │
│ ⚠️ 16 migrations need to be applied manually                │
│    Click on a pending migration below to get the SQL        │
│    and instructions                                          │
│                                                              │
│    [🔗 Open Supabase SQL Editor]                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Migrations List (scrollable):                               │
│                                                              │
│ ✅ 20251108052000_bee9ee20...sql        [Applied]          │
│ ✅ 20251109045855_6a7fc76b...sql        [Applied]          │
│ ⚠️ 20251110192108_fab519ce...sql        [Pending]   ⬅️ CLICK│
│ ⚠️ 20251111085548_c85ce8a8...sql        [Pending]          │
│ ⚠️ 20251111100012_f27546a6...sql        [Pending]          │
│ ...                                                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ 💡 This manual mode works on Lovable. Migrations must be   │
│    applied via Supabase SQL Editor. Click on any pending    │
│    migration for step-by-step instructions.                 │
└─────────────────────────────────────────────────────────────┘
```

## When You Click on a Pending Migration

The migration expands to show detailed instructions:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ 20251110192108_fab519ce...sql        [Pending]   ⬇️     │
├─────────────────────────────────────────────────────────────┤
│ │ How to apply this migration:                             │
│ │                                                           │
│ │ Step 1: Get the SQL                                      │
│ │ [🔗 View SQL on GitHub]  [📋 Copy URL]                  │
│ │                                                           │
│ │ Step 2: Run in Supabase SQL Editor                      │
│ │ 1. Open the SQL file from GitHub (button above)         │
│ │ 2. Copy all the SQL content (Ctrl+A, Ctrl+C)            │
│ │ 3. Open Supabase SQL Editor (button below)              │
│ │ 4. Paste the SQL and click "Run" (or press F5)          │
│ │                                                           │
│ │ [🚀 Open Supabase SQL Editor]                           │
│ │                                                           │
│ │ Step 3: Mark as applied                                  │
│ │ ┌─────────────────────────────────────────────┐         │
│ │ │ INSERT INTO schema_migrations (version)     │         │
│ │ │ VALUES ('20251110192108_fab519ce...')       │         │
│ │ │ ON CONFLICT (version) DO NOTHING;           │         │
│ │ └─────────────────────────────────────────────┘         │
│ │ [📋 Copy "Mark as Applied" SQL]                         │
│ │                                                           │
│ │ ⓘ After running both SQLs, click "Refresh" above to    │
│ │   update the status                                      │
└─────────────────────────────────────────────────────────────┘
```

## What Happens When You Click "View SQL on GitHub"

A new browser tab opens showing the migration file on GitHub:

```
GitHub URL: 
https://raw.githubusercontent.com/craigfelt/oricol-ticket-flow-4084ab4c/main/supabase/migrations/20251110192108_fab519ce...sql

You'll see the SQL code like:
┌─────────────────────────────────────────────────────────────┐
│ -- Migration: 20251110192108_fab519ce...                    │
│                                                              │
│ CREATE TABLE IF NOT EXISTS tickets (                        │
│   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            │
│   title TEXT NOT NULL,                                      │
│   description TEXT,                                         │
│   status TEXT NOT NULL,                                     │
│   created_at TIMESTAMPTZ DEFAULT NOW()                      │
│ );                                                           │
│                                                              │
│ CREATE INDEX idx_tickets_status ON tickets(status);         │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘

Select all (Ctrl+A) and copy (Ctrl+C)
```

## What Happens When You Click "Open Supabase SQL Editor"

A new browser tab opens at your Supabase project's SQL Editor:

```
Supabase Dashboard > SQL Editor

URL: https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp/sql

┌─────────────────────────────────────────────────────────────┐
│ SQL Editor                                    [+ New Query] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1  -- Paste your SQL here                                  │
│  2                                                           │
│  3                                                           │
│                                                              │
│                                       [▶️ Run] [💾 Save]    │
└─────────────────────────────────────────────────────────────┘

Paste the SQL here (Ctrl+V) and click Run
```

## After Running the Migration

The SQL Editor shows success:

```
┌─────────────────────────────────────────────────────────────┐
│ Results                                                      │
├─────────────────────────────────────────────────────────────┤
│ ✅ Success. No rows returned                                │
│                                                              │
│ Rows: 0                                                      │
│ Time: 234ms                                                  │
└─────────────────────────────────────────────────────────────┘
```

## After Marking as Applied and Clicking "Refresh"

Back in your Oricol Dashboard, the migration status updates:

```
┌─────────────────────────────────────────────────────────────┐
│ 🗄️ Database Migrations (Manual Mode)          [🔄 Refresh] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ 46 Applied    ⚠️ 15 Pending       ⬅️ Count updated!     │
│                                                              │
│ Migrations List:                                             │
│                                                              │
│ ✅ 20251108052000_bee9ee20...sql        [Applied]          │
│ ✅ 20251109045855_6a7fc76b...sql        [Applied]          │
│ ✅ 20251110192108_fab519ce...sql        [Applied]   ⬅️ NOW!│
│ ⚠️ 20251111085548_c85ce8a8...sql        [Pending]          │
│ ⚠️ 20251111100012_f27546a6...sql        [Pending]          │
└─────────────────────────────────────────────────────────────┘
```

## Tips for Success

### ✅ DO:
- Apply migrations in order (oldest first)
- Read the migration SQL before running it
- Click "Refresh" after applying each migration
- Check the browser console (F12) if something goes wrong

### ❌ DON'T:
- Skip migrations (apply in order)
- Apply the same migration twice (it will error)
- Forget to mark as applied (or it will show as pending forever)
- Panic if something fails (most issues are easy to fix)

## Common Screens You'll See

### If schema_migrations Table Doesn't Exist Yet

```
Error checking migrations:
"relation 'public.schema_migrations' does not exist"

⚠️ You need to create it first! See LOVABLE_MIGRATION_STEP_BY_STEP.md
```

### If You Try to Apply a Migration That's Already Applied

```
Supabase SQL Editor:
❌ Error: duplicate key value violates unique constraint
"schema_migrations_pkey"

✅ This is OK! It means the migration was already applied.
Just mark it as applied or skip to the next one.
```

### If a Migration Fails

```
Supabase SQL Editor:
❌ Error: syntax error at or near "CREAT"
Line 5: CREAT TABLE ...

⚠️ Check the SQL you copied - make sure you got everything!
```

## What Success Looks Like

After applying all pending migrations:

```
┌─────────────────────────────────────────────────────────────┐
│ 🗄️ Database Migrations (Manual Mode)          [🔄 Refresh] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ 61 Applied    ⚠️ 0 Pending                               │
│                                                              │
│ All migrations are up to date! 🎉                           │
└─────────────────────────────────────────────────────────────┘
```

---

**Ready to start?** Go to your Oricol Dashboard and find the "Database Migrations (Manual Mode)" card!

**Need help?** See [LOVABLE_MIGRATION_STEP_BY_STEP.md](./LOVABLE_MIGRATION_STEP_BY_STEP.md) for detailed instructions.
