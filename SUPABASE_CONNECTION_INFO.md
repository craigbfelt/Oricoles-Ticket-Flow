# Supabase Connection Information

## Your Supabase Instance Details

Your project is connected to the following Supabase instance via Lovable Cloud:

### Connection Details
- **Project ID**: `kwmeqvrmtivmljujwocp`
- **Supabase URL**: `https://kwmeqvrmtivmljujwocp.supabase.co`
- **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bWVxdnJtdGl2bWxqdWp3b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NzAxNDAsImV4cCI6MjA3ODE0NjE0MH0.w35gZYkiFEgI2ymoQNq9zcZDhZ7-TLf5YiWg04XJbrE`

### Dashboard Access
To manually configure your storage buckets and RLS policies:
1. Go to: `https://supabase.com/dashboard/project/kwmeqvrmtivmljujwocp`
2. Navigate to **Storage** → **Buckets** for bucket configuration
3. Navigate to **Storage** → **Policies** for RLS policy management

## Current Storage Buckets

### documents
- **Bucket Name**: `documents`
- **Public Access**: Yes (configured as public)
- **Purpose**: Stores all uploaded documents (PDF, Word, images, etc.)

### diagrams
- **Bucket Name**: `diagrams`  
- **Public Access**: Yes (configured as public)
- **Purpose**: Stores network diagrams and extracted images

## RLS Policies Status

Based on the errors you're experiencing, the issue is likely with the RLS policies on the `storage.objects` table.

### Expected Policies (that should exist)
For authenticated users on both buckets:
- ✅ **SELECT** - Allow reading files
- ❌ **INSERT** - Allow uploading files (THIS IS LIKELY MISSING - causing your error)
- ✅ **UPDATE** - Allow updating files  
- ✅ **DELETE** - Allow deleting files

For public/anonymous users:
- ✅ **SELECT** - Allow reading files from public buckets

## Debugging Information Added

I've added comprehensive debug logging to `src/components/DocumentUpload.tsx`. When you upload a document, you'll see detailed logs in the browser console showing:

1. **File Details**: Name, size, type
2. **Authentication Status**: User ID, email, session status
3. **Storage Upload**: Bucket, path, result, any errors
4. **Database Insert**: All metadata being inserted, error codes, hints

### How to View Debug Logs
1. Open your browser's Developer Console (F12)
2. Try uploading a document
3. Look for logs starting with 🔍 emoji
4. Share the complete error output for further troubleshooting

## Common RLS Error Causes

The "new row violates row level security policy" error typically occurs when:

1. ❌ **Missing INSERT policy** on `storage.objects` for the `documents` or `diagrams` bucket
2. ❌ **Policy has wrong conditions** (e.g., checking wrong user ID)
3. ❌ **User not authenticated** properly
4. ❌ **Policy uses wrong bucket check** in the WHERE clause

## Next Steps

1. **Try uploading a document** - Check the browser console for debug output
2. **Look for the specific RLS error** in the logs (it will show error code, message, hint)
3. **Access Supabase Dashboard** using the URL above
4. **Check Storage Policies** - Verify INSERT policy exists for authenticated users on both buckets
5. **Share debug output** if the error persists

## Manual RLS Policy Fix (if needed)

If policies are missing, you can add them manually in the Supabase Dashboard → Storage → Policies:

```sql
-- Allow authenticated users to upload to documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to upload to diagrams bucket  
CREATE POLICY "Authenticated users can upload diagrams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diagrams');
```
