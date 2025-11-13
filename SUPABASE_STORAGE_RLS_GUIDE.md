# Supabase Storage RLS Guide for Lovable Apps

A comprehensive guide to understanding and fixing "new row violates row-level security policy" errors when uploading files in Lovable applications powered by Supabase.

## Table of Contents
- [Understanding the Error](#understanding-the-error)
- [Quick Fix Guide](#quick-fix-guide)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Common Use Cases](#common-use-cases)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [This Project's Implementation](#this-projects-implementation)

---

## Understanding the Error

### What Causes This Error?

The error **"new row violates row-level security policy"** typically occurs in Supabase when:

1. **Row Level Security (RLS) is enabled** on the `storage.objects` table (enabled by default in Supabase)
2. **No INSERT policy exists** that allows authenticated users to upload files
3. **Existing policies don't match** the conditions required for the upload operation

This is actually a **security feature**, not a bug. Supabase prevents unauthorized file uploads until you explicitly define who can upload what.

### How Lovable Apps Work with Supabase Storage

Lovable's native Supabase integration automatically handles file uploads to storage buckets when you use Upload components. However:

- **Development**: Supabase starts with permissive defaults for testing
- **Production**: You must configure proper RLS policies for security
- **Integration**: Lovable generates upload code, but you configure the security policies

---

## Quick Fix Guide

### Step 1: Access Your Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project connected to Lovable
3. Navigate to **Storage** in the left sidebar

### Step 2: Identify Your Bucket

Find the storage bucket your app uses for uploads:
- Common buckets: `avatars`, `documents`, `diagrams`, `public`
- Check your app code or Lovable-generated components to confirm the bucket name

### Step 3: Create an INSERT Policy

1. Click on your bucket
2. Go to the **Policies** tab
3. Click **New Policy**
4. Choose **For INSERT** (uploads create new rows)
5. Use one of the policy templates below

#### Option A: Allow All Authenticated Users (Simple)

**Best for**: Apps where all logged-in users should be able to upload files

```sql
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'your-bucket-name');
```

Replace `'your-bucket-name'` with your actual bucket name (e.g., `'documents'`, `'avatars'`).

#### Option B: User-Specific Folders (Secure)

**Best for**: Apps where users should only upload to their own folder

```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'your-bucket-name'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

This assumes files are organized like: `user-uuid/filename.pdf`

#### Option C: Public Uploads (Least Secure)

**Best for**: Public file sharing features (use with caution)

```sql
CREATE POLICY "Anyone can upload files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'your-bucket-name');
```

### Step 4: Add SELECT Policy (For Viewing)

If users can't view uploaded files, add a SELECT policy:

```sql
CREATE POLICY "Public users can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'your-bucket-name');
```

Or for user-specific access:

```sql
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'your-bucket-name'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 5: Add UPDATE and DELETE Policies (Optional)

For complete file management:

```sql
-- Allow updates
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'your-bucket-name')
WITH CHECK (bucket_id = 'your-bucket-name');

-- Allow deletions
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'your-bucket-name');
```

---

## Detailed Setup Instructions

### Using Supabase SQL Editor

You can also create policies using the SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Paste your policy SQL
4. Click **Run**

Example complete setup:

```sql
-- Enable RLS (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (optional, for clean slate)
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view files" ON storage.objects;

-- Create new policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public users can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### Creating Policies via Migrations

For production apps, store policies in migration files:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_storage_policies.sql

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- public bucket for easy viewing
  104857600,  -- 100MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public users can view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
```

---

## Common Use Cases

### 1. Profile Pictures/Avatars

**Requirement**: Users upload their own avatar, organized by user ID

```sql
-- Bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Upload policy (user-specific folders)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- View policy (public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**File path format**: `{user-id}/avatar.jpg`

### 2. Document Management System

**Requirement**: All authenticated users can upload and view documents

```sql
-- Bucket setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  104857600,  -- 100MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public can view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

### 3. Team/Organization Files

**Requirement**: Users can only upload to their organization's folder

```sql
-- Assumes you have an organizations table with user membership

CREATE POLICY "Users can upload to org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-files'
  AND (storage.foldername(name))[1] IN (
    SELECT org_id::text 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### 4. Network Diagrams/Images

**Requirement**: Image uploads for documentation, with public viewing

```sql
-- Bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,
  52428800,  -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Simple policies for authenticated uploads
CREATE POLICY "Authenticated users can upload diagrams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "Public can view diagrams"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagrams');
```

---

## Security Best Practices

### 1. Choose the Right Bucket Visibility

**Public Buckets** (`public = true`):
- ✅ Files accessible via direct URL without authentication
- ✅ Simpler for images, PDFs displayed in-app
- ❌ Anyone with the URL can view the file
- **Use for**: Public content, non-sensitive images, shared documents

**Private Buckets** (`public = false`):
- ✅ Files require signed URLs for access
- ✅ Better security for sensitive content
- ❌ More complex to implement in your app
- **Use for**: Private documents, sensitive user data

### 2. Limit File Types

Always specify `allowed_mime_types` in your bucket:

```sql
allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg'
]
```

This prevents users from uploading executable files or other dangerous content.

### 3. Set File Size Limits

Prevent abuse with reasonable limits:

```sql
file_size_limit = 52428800  -- 50MB
```

**Supabase free tier**: 50MB per file maximum  
**Paid plans**: Larger files supported

### 4. Use Unique Filenames

Prevent overwrites and conflicts:

```javascript
// In your Lovable/React code
const timestamp = Date.now();
const filename = `${timestamp}_${file.name}`;
const path = `documents/${filename}`;
```

### 5. Organize with Folders

Structure your storage logically:

```
avatars/
  {user-id}/
    avatar.jpg

documents/
  {timestamp}_{filename}.pdf

team-files/
  {org-id}/
    {timestamp}_{filename}.docx
```

### 6. Monitor Storage Usage

Track uploads in a database table:

```sql
CREATE TABLE document_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

### 7. Clean Up Orphaned Files

Periodically remove files that aren't referenced in your database:

```sql
-- Find files not in metadata table
SELECT * FROM storage.objects
WHERE bucket_id = 'documents'
AND name NOT IN (SELECT storage_path FROM document_metadata);
```

---

## Troubleshooting

### Error: "new row violates row-level security policy"

**Cause**: Missing or incorrect INSERT policy

**Solution**:
1. Verify you're authenticated: `const { data: { session } } = await supabase.auth.getSession();`
2. Check the bucket name in your code matches the policy
3. Ensure the policy's `WITH CHECK` condition is met
4. Verify RLS is enabled: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`

### Error: "Bucket not found"

**Cause**: Storage bucket doesn't exist

**Solution**:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('your-bucket', 'your-bucket', true)
ON CONFLICT (id) DO NOTHING;
```

### Files Upload But Can't Be Viewed

**Cause**: Missing SELECT policy

**Solution**:
```sql
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'your-bucket');
```

### Upload Works in Dev but Fails in Production

**Cause**: Different RLS policies between environments

**Solution**:
- Use migrations to ensure policies are consistent
- Check Supabase dashboard policies on both projects
- Verify environment variables point to correct project

### Error: "row-level security policy for table 'objects' is not met"

**Cause**: User trying to upload to a folder they don't own

**Solution**:
- Adjust folder structure in code to match policy
- Or update policy to allow the upload pattern

```sql
-- If using user-specific folders, ensure path is: {user-id}/filename
const path = `${session.user.id}/${filename}`;
```

### Cannot Delete Files

**Cause**: Missing DELETE policy

**Solution**:
```sql
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'your-bucket');
```

For user-specific deletion:

```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'your-bucket'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## This Project's Implementation

This project has implemented comprehensive RLS policies for file uploads. Here's what's configured:

### Storage Buckets

1. **`documents` bucket** - For general document uploads
   - Public: Yes (for easy viewing)
   - Size limit: 100MB
   - Allowed types: PDF, Word, Excel, PowerPoint, images, text files
   - Location: `supabase/migrations/20251113142600_create_documents_table_and_bucket.sql`

2. **`diagrams` bucket** - For network diagrams and images
   - Public: Yes
   - Size limit: 50MB
   - Allowed types: PNG, JPEG, JPG, WebP, GIF
   - Location: `supabase/migrations/20251113111200_create_diagrams_storage_bucket.sql`

### Policies Applied

**Documents Bucket**:
```sql
-- INSERT: All authenticated users can upload
CREATE POLICY "Authenticated users can upload documents to storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- SELECT: Public viewing (required for document display)
CREATE POLICY "Public users can view documents in storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- UPDATE: Authenticated users can update
CREATE POLICY "Authenticated users can update documents in storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- DELETE: Authenticated users can delete
CREATE POLICY "Authenticated users can delete documents from storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```

**Diagrams Bucket**:
```sql
-- Similar policies for diagrams bucket
CREATE POLICY "Authenticated users can upload diagrams"...
CREATE POLICY "Public users can view diagrams"...
CREATE POLICY "Authenticated users can update diagrams"...
CREATE POLICY "Authenticated users can delete diagrams"...
```

### How It Works in This App

1. **User uploads a file** via DocumentUpload component
2. **File is saved** to the `documents` bucket in storage
3. **Metadata is saved** to the `documents` database table
4. **RLS policies allow** the upload because user is authenticated
5. **File is viewable** by anyone (public SELECT policy)
6. **Document appears** in Document Hub for all users

### Related Documentation

- [DOCUMENT_UPLOAD_RLS_FIX.md](./DOCUMENT_UPLOAD_RLS_FIX.md) - Specific fix applied to this project
- [RLS_DOCUMENT_UPLOAD_FIX.md](./RLS_DOCUMENT_UPLOAD_FIX.md) - Detailed implementation summary
- [STORAGE_BUCKET_FIX.md](./STORAGE_BUCKET_FIX.md) - Storage bucket setup guide
- [DOCUMENT_HUB_IMPLEMENTATION.md](./DOCUMENT_HUB_IMPLEMENTATION.md) - Document Hub feature overview

---

## Additional Resources

### Lovable-Specific Tips

1. **Generate Policies with Lovable AI**:
   - In Lovable chat: "Generate RLS policies for file uploads in Supabase"
   - Lovable can auto-generate basic policies for your use case

2. **Check Lovable-Generated Code**:
   - Look for `supabase.storage.from('bucket-name')` calls
   - This tells you which bucket your app uses

3. **Lovable Auto-Creates Buckets**:
   - When you add upload features, Lovable may create buckets like `public/avatar-images`
   - Check Storage dashboard to see what exists

### Supabase Resources

- [Official Storage RLS Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Policies Documentation](https://supabase.com/docs/guides/storage/security/policies)
- [Storage Helper Functions](https://supabase.com/docs/guides/storage/security/helper-functions)

### Common Patterns

**Check if user is authenticated**:
```javascript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast.error('Please sign in to upload files');
  return;
}
```

**Upload with error handling**:
```javascript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(path, file);

if (error) {
  console.error('Upload error:', error);
  toast.error('Failed to upload file');
} else {
  toast.success('File uploaded successfully');
}
```

**Get public URL**:
```javascript
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl(path);

console.log('File URL:', data.publicUrl);
```

---

## Quick Reference

### Policy Template Cheat Sheet

```sql
-- All authenticated users can upload
WITH CHECK (bucket_id = 'bucket-name')

-- Users can only upload to own folder
WITH CHECK (
  bucket_id = 'bucket-name'
  AND auth.uid()::text = (storage.foldername(name))[1]
)

-- Public viewing
USING (bucket_id = 'bucket-name')

-- User can only view own files
USING (
  bucket_id = 'bucket-name'
  AND auth.uid()::text = (storage.foldername(name))[1]
)

-- Anyone can upload (use cautiously)
TO public
WITH CHECK (bucket_id = 'bucket-name')
```

### File Size Limits

- **Free tier**: 50MB per file
- **Pro tier**: 50GB per file
- Set in bucket: `file_size_limit = 52428800` (bytes)

### Bucket Settings

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bucket-id',           -- Unique ID
  'bucket-name',         -- Display name
  true,                  -- Public (true/false)
  52428800,              -- Size limit in bytes
  ARRAY['image/png']     -- Allowed MIME types
);
```

---

## Summary

**The key takeaway**: RLS errors are a security feature, not a bug. Supabase requires explicit policies before allowing file uploads.

**To fix**:
1. Identify your storage bucket
2. Create INSERT policy for uploads
3. Create SELECT policy for viewing
4. Test the upload flow
5. Add UPDATE/DELETE policies as needed

**Best practices**:
- Use migrations for production
- Limit file types and sizes
- Choose appropriate bucket visibility
- Track uploads in a database table
- Test policies before deploying

With proper RLS policies, your Lovable app will have secure, reliable file uploads! 🚀

---

**Last Updated**: 2025-11-13  
**Project**: Oricol Helpdesk App  
**Supabase Version**: Compatible with all versions
