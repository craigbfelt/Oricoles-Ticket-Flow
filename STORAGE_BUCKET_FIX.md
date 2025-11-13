# Storage Bucket Fix - "Bucket Not Found" Error Resolution

## Problem Description

Users were encountering a "bucket not found" error when attempting to upload images through various features in the application:

- **Company Network Diagram** page - Upload Image button
- **Branch Details** page - Upload Image button for network diagrams
- **Nymbis RDP Cloud** page - Image uploads for cloud network diagrams
- **Document Import** page - Extracting and uploading images from documents
- **Import Item Selector** - Importing images to various destinations

## Root Cause

The application code referenced a Supabase storage bucket named `'diagrams'` that didn't exist in the Supabase project. This bucket is used throughout the application for storing:

1. Company-wide network diagrams
2. Branch-specific network diagrams
3. Nymbis RDP cloud network diagrams
4. Images extracted from Word/PDF documents
5. Page snapshots from PDF imports

## Solution

Created migration `20251113111200_create_diagrams_storage_bucket.sql` that:

1. **Creates the 'diagrams' storage bucket** with:
   - Bucket ID: `diagrams`
   - Public access enabled (for viewing images in the UI)
   - 50MB file size limit
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`

2. **Implements Row Level Security (RLS) policies**:
   - **INSERT**: Only authenticated users can upload images
   - **SELECT**: Public read access (needed for displaying images in the app)
   - **UPDATE**: Only authenticated users can update images
   - **DELETE**: Only authenticated users can delete images

3. **Includes safety features**:
   - Uses `ON CONFLICT DO NOTHING` to avoid errors if bucket already exists
   - Drops existing policies before creating new ones to prevent conflicts
   - Enables RLS on storage.objects table

## How to Apply

### For Supabase Cloud Projects

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Run the migration file content OR
4. The migration will be automatically applied on next deployment if using Supabase CLI

### For Local Development with Supabase CLI

```bash
supabase db reset
# or
supabase migration up
```

## Verification

After applying the migration, verify the bucket was created:

1. Go to Supabase Dashboard → Storage
2. Confirm the 'diagrams' bucket exists
3. Check the bucket settings:
   - Public: Yes
   - File size limit: 50MB
   - Allowed MIME types: Image formats only

## Testing

Test image uploads in the following locations:

### 1. Company Network Diagram
- Navigate to: Company Network Overview page
- Click "Upload Image" button
- Select a PNG/JPG image
- Fill in diagram name and description
- Click "Upload"
- Expected: Success message, image appears in diagrams list

### 2. Branch Details
- Navigate to: Any branch details page
- Scroll to "Network Diagrams" section
- Click "Upload Image" button
- Select an image file
- Fill in name and description
- Click "Upload"
- Expected: Success message, diagram appears in the list

### 3. Nymbis RDP Cloud
- Navigate to: Nymbis RDP Cloud page
- Click "Add Network" or similar button
- Upload an image as part of network creation
- Expected: Image uploads successfully

### 4. Document Import
- Navigate to: Document Import page
- Upload a Word document or PDF with images
- Images should be extracted and uploaded to storage
- Use Import Item Selector to import images
- Expected: Images upload successfully to chosen destinations

## Security Considerations

The migration implements the following security measures:

1. **RLS Enabled**: Row Level Security is enforced on all storage operations
2. **Authenticated Uploads**: Only logged-in users can upload files
3. **Public Read**: Allows viewing images without authentication (required for app functionality)
4. **File Size Limit**: 50MB maximum prevents abuse and excessive storage use
5. **MIME Type Restrictions**: Only image files are allowed, preventing upload of executable or malicious files
6. **Type Safety**: Specific image formats are whitelisted (PNG, JPEG, JPG, WEBP, GIF)

## Files Modified

- ✅ `supabase/migrations/20251113111200_create_diagrams_storage_bucket.sql` (created)

## Files That Use This Bucket

The following files reference the 'diagrams' bucket:

1. `src/pages/CompanyNetworkDiagram.tsx` - Lines 273, 369, 668
2. `src/pages/BranchDetails.tsx` - Lines 328, 1329
3. `src/pages/NymbisRdpCloud.tsx` - Lines 188, 704
4. `src/components/DocumentUpload.tsx` - Line 140
5. `src/components/ImportItemSelector.tsx` - Lines 142, 186

All these files will work correctly once the migration is applied.

## Rollback Instructions

If needed, the bucket can be removed with:

```sql
-- Remove the bucket and all its contents
DELETE FROM storage.objects WHERE bucket_id = 'diagrams';
DELETE FROM storage.buckets WHERE id = 'diagrams';

-- Drop the policies
DROP POLICY IF EXISTS "Authenticated users can upload diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diagrams" ON storage.objects;
```

**Warning**: This will delete all uploaded images in the bucket!

## Future Considerations

- Consider implementing automated cleanup of orphaned images
- Monitor storage usage and adjust file size limits if needed
- Consider adding image optimization/compression before upload
- Implement versioning for diagram images
- Add audit logging for image uploads/deletions

## Support

If issues persist after applying the migration:

1. Check Supabase project logs for detailed error messages
2. Verify the bucket appears in Storage dashboard
3. Test with a small PNG image first
4. Check browser console for specific error messages
5. Verify user is authenticated before attempting upload

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Document Import Guide](./DOCUMENT_IMPORT.md)
