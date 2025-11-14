# Quick Fix Summary: RLS Permission Error

## Problem
Users getting error: **"you do not have access to perform this function - RLS policy"**

## Root Cause
The `storage.buckets` table had RLS enabled but no policies, preventing users from querying bucket information.

## Solution
Apply migration: `supabase/migrations/20251114070500_fix_storage_buckets_rls.sql`

## Quick Apply (Supabase Dashboard)

1. Go to https://supabase.com → Your Project → SQL Editor
2. Paste this SQL:

```sql
-- Fix RLS policy for storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to buckets" ON storage.buckets;

CREATE POLICY "Allow public read access to buckets"
  ON storage.buckets
  FOR SELECT
  TO public
  USING (true);
```

3. Click **Run**
4. Wait for "Success"
5. Test by uploading a document

## Verify Fix Applied

Run this in SQL Editor:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'buckets' AND schemaname = 'storage';
```

Should return: `Allow public read access to buckets`

## What This Fixes
- ✅ Upload errors in Document Hub
- ✅ Image upload errors in Network Diagrams
- ✅ "Permission denied" errors when querying buckets
- ✅ Upload service bucket accessibility checks

## Is This Safe?
**Yes!** This only allows users to READ bucket metadata (names, limits). 
- Cannot create/modify/delete buckets
- File access still controlled by existing RLS policies
- Standard Supabase pattern for public apps

## More Info
See [RLS_PERMISSION_FIX.md](./RLS_PERMISSION_FIX.md) for complete documentation.

---
**Fix Applied**: 2025-11-14  
**Migration**: 20251114070500  
**Status**: ✅ Ready to Deploy
