# Quick Deploy: Storage Bucket Migration

## The Problem
Users get "bucket not found" error when uploading images.

## The Solution
Run the storage bucket migration to create the 'diagrams' bucket.

## How to Deploy (Choose One Method)

### Method 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the sidebar
4. Click "New Query"
5. Copy the entire content of `supabase/migrations/20251113111200_create_diagrams_storage_bucket.sql`
6. Paste it into the SQL editor
7. Click "Run" or press Cmd/Ctrl + Enter
8. You should see "Success. No rows returned"

### Method 2: Via Supabase CLI (If installed)

```bash
# From the project directory
supabase db push

# Or run the specific migration
supabase migration up --db-url "your-supabase-connection-string"
```

### Method 3: Manual SQL Execution

Connect to your Supabase database and run:

```sql
-- Create the diagrams storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diagrams" ON storage.objects;

-- Create new policies
CREATE POLICY "Authenticated users can upload diagrams"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "Public users can view diagrams"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'diagrams');

CREATE POLICY "Authenticated users can update diagrams"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'diagrams')
WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "Authenticated users can delete diagrams"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'diagrams');
```

## Verify It Worked

### Check in Dashboard
1. Go to Storage in Supabase Dashboard
2. You should see a bucket named "diagrams"
3. Click on it - it should be empty (ready for uploads)

### Test Image Upload
1. Go to your app
2. Navigate to "Company Network Overview" or "Branch Details"
3. Click "Upload Image"
4. Select an image file
5. Fill in the form
6. Click "Upload"
7. Should see success message ✅

## Troubleshooting

### "Permission denied for relation storage.buckets"
- You need to be connected as a superuser (postgres user)
- Use the connection string from Supabase Dashboard → Settings → Database → Connection String

### "Bucket already exists"
- This is fine! The migration uses `ON CONFLICT DO NOTHING`
- Just continue to create the policies

### Still getting "bucket not found"
1. Verify the bucket exists in Storage dashboard
2. Check browser console for actual error message
3. Try logging out and logging back in
4. Clear browser cache
5. Check that you're using the correct Supabase URL/key in `.env`

## What This Fixes

After running this migration, these features will work:
- ✅ Upload Image in Company Network Diagram
- ✅ Upload Image in Branch Details
- ✅ Upload Image in Nymbis RDP Cloud
- ✅ Document Import image extraction
- ✅ Import Item Selector image uploads

## Need Help?

See the full documentation: [STORAGE_BUCKET_FIX.md](./STORAGE_BUCKET_FIX.md)
