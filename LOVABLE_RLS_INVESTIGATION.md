# RLS Policies Investigation and Fix for Lovable Deployment

## Date
2025-11-15

## Context
This document outlines the investigation and resolution of Row Level Security (RLS) policies for the Lovable deployment of the Oricol Helpdesk application.

## Problem Statement
The application running on Lovable may experience RLS-related issues when uploading files to storage buckets. This investigation ensures all RLS policies are correctly configured for production use.

## Investigation

### 1. Existing RLS Migrations
The repository already contains several RLS-related migrations:

#### Storage Bucket Migrations
- **20251113111200_create_diagrams_storage_bucket.sql**
  - Creates `diagrams` bucket for images and network diagrams
  - Sets up basic RLS policies for authenticated users
  - Configured with 50MB limit and image MIME types

- **20251113142600_create_documents_table_and_bucket.sql**
  - Creates `documents` bucket for document uploads
  - Initial RLS policies setup

- **20251113151700_fix_documents_storage_policies.sql**
  - Fixes missing storage policies for documents bucket
  - Resolves "new row violates row level security" errors

- **20251113232600_comprehensive_rls_fix.sql**
  - Comprehensive cleanup of duplicate and conflicting policies
  - Standardizes policy naming conventions
  - Ensures buckets are properly configured as public

### 2. Current Storage Buckets

#### Documents Bucket
- **ID**: `documents`
- **Public**: `true` (allows direct file access)
- **Size Limit**: Should be 100MB
- **Allowed Types**: PDF, Word, Excel, images, text
- **Usage**: Document Hub, file uploads, document import

#### Diagrams Bucket
- **ID**: `diagrams`
- **Public**: `true` (allows direct image access)
- **Size Limit**: 50MB
- **Allowed Types**: PNG, JPEG, WebP, GIF, SVG
- **Usage**: Network diagrams, branch images, extracted images

### 3. Code Analysis

#### Storage Upload Locations
The application uploads to storage in multiple places:

1. **DocumentUpload.tsx** (Line 139-141)
   - Uploads images to `diagrams` bucket
   - Path: `document-images/{timestamp}_{filename}`

2. **DocumentUpload.tsx** (Line 263-265)
   - Uploads documents to `documents` bucket
   - Path: `{category}/{timestamp}_{filename}`

3. **Other Components**
   - CompanyNetworkDiagram.tsx - uses `diagrams` bucket
   - Branches.tsx - uses `diagrams` bucket
   - BranchDetails.tsx - uses `diagrams` bucket
   - NymbisRdpCloud.tsx - uses `diagrams` bucket

### 4. Required RLS Policies

For each bucket, four policies are needed:

#### INSERT Policy
- **Who**: Authenticated users
- **Why**: Allows logged-in users to upload files
- **Check**: `bucket_id = 'bucket_name'`

#### SELECT Policy
- **Who**: Public users
- **Why**: Allows viewing/downloading files without auth (since bucket is public)
- **Check**: `bucket_id = 'bucket_name'`

#### UPDATE Policy
- **Who**: Authenticated users
- **Why**: Allows modifying file metadata
- **Check**: `bucket_id = 'bucket_name'`

#### DELETE Policy
- **Who**: Authenticated users
- **Why**: Allows removing files
- **Check**: `bucket_id = 'bucket_name'`

## Issues Identified

### Potential Problems
1. **Policy Naming Conflicts**: Multiple migrations may have created policies with similar names, causing conflicts
2. **Bucket Configuration Drift**: Bucket settings (public flag, size limits) may not match requirements
3. **Missing Permissions**: `authenticated` role may not have proper grants on storage schema
4. **Table RLS**: Documents and import_jobs tables need RLS policies for metadata

## Solution

### New Migration: `20251115133000_verify_and_fix_lovable_rls.sql`

This comprehensive migration:

1. **Verifies/Creates Buckets**
   - Uses `ON CONFLICT DO UPDATE` to ensure correct configuration
   - Sets proper size limits and MIME type restrictions
   - Ensures both buckets are public

2. **Complete Policy Reset**
   - Dynamically drops ALL existing document/diagram policies
   - Prevents conflicts from previous migrations
   - Ensures clean slate for new policies

3. **Creates Consistent Policies**
   - New naming convention: `{bucket}_storage_{operation}_policy`
   - All four operations (INSERT, SELECT, UPDATE, DELETE) for each bucket
   - Clear, predictable policy names

4. **Table RLS Policies**
   - Ensures `documents` and `import_jobs` tables have RLS enabled
   - Creates policies for authenticated users to access table data
   - Uses conditional logic to only create if tables exist

5. **Permission Grants**
   - Explicitly grants necessary permissions to `authenticated` role
   - Ensures users can interact with storage schema

## Testing

### Pre-Migration Checks
```sql
-- Check existing buckets
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id IN ('documents', 'diagrams');

-- Check existing policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE '%document%' OR policyname LIKE '%diagram%');
```

### Post-Migration Verification
```sql
-- Verify buckets are configured correctly
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id IN ('documents', 'diagrams');

-- Verify policies exist (should see 4 per bucket = 8 total)
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%_policy'
ORDER BY policyname;

-- Verify table policies (should see 4 per table if tables exist)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'import_jobs')
ORDER BY tablename, policyname;
```

### Functional Testing
1. **Upload Document**
   - Navigate to Document Hub or Document Import
   - Upload a PDF file
   - Verify: No RLS errors, file appears in list

2. **Upload Image**
   - Navigate to Company Network Diagram or Branches
   - Upload a PNG/JPEG image
   - Verify: No RLS errors, image displays correctly

3. **View File**
   - Click on uploaded document/image
   - Verify: File opens/downloads correctly

4. **Delete File**
   - Delete an uploaded file
   - Verify: File removed from storage and database

## Deployment Instructions

### For Lovable Deployment
1. This migration will run automatically when Supabase syncs with the repository
2. No manual intervention required
3. Migration is idempotent - safe to run multiple times

### For Local Development
```bash
# Apply migration to local Supabase
npx supabase db push

# Or reset and apply all migrations
npx supabase db reset
```

### For Cloud Supabase
```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

## Security Considerations

### Why Public Buckets?
Both buckets are configured as `public = true`:

**Advantages:**
- Direct file access without complex authentication
- Embedded viewers (PDF, images) work seamlessly
- Simpler URL generation for file sharing
- Better performance (no auth check on every file access)

**Security:**
- File names are timestamped and unique (not guessable)
- Only authenticated users can upload/modify/delete
- MIME type restrictions prevent malicious files
- RLS policies still protect metadata in database tables

### Why Allow All Authenticated Users?
Policies grant access to ALL authenticated users (not role-based):

**Reasoning:**
- Application removed role-based storage restrictions (per migration 20251112204108)
- UI components don't enforce role-based document access
- Simpler permission model reduces complexity
- All logged-in users are trusted within the organization

**If Role-Based Access Needed:**
Modify the policies to include role checks:
```sql
-- Example: Only admins can delete
CREATE POLICY "documents_storage_delete_admin_only"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

## Monitoring and Troubleshooting

### Check for RLS Errors in Logs
Look for errors containing:
- "new row violates row-level security policy"
- "permission denied for schema storage"
- "policy ... does not exist"

### Common Issues and Solutions

**Issue**: "new row violates row-level security"
- **Cause**: Missing INSERT policy or policy not matching bucket_id
- **Solution**: Verify policy exists and check bucket_id in WITH CHECK clause

**Issue**: "permission denied for schema storage"
- **Cause**: Missing grants on storage schema
- **Solution**: Run GRANT statements in Part 8 of migration

**Issue**: Files upload but can't be viewed
- **Cause**: Missing SELECT policy or bucket not public
- **Solution**: Verify SELECT policy exists and bucket.public = true

**Issue**: "policy already exists"
- **Cause**: Previous migration didn't drop policy before creating
- **Solution**: Run Part 3 of migration to clean up all policies

## Related Documentation
- [DOCUMENT_UPLOAD_RLS_FIX.md](./DOCUMENT_UPLOAD_RLS_FIX.md) - Previous RLS fix
- [SUPABASE_STORAGE_RLS_GUIDE.md](./SUPABASE_STORAGE_RLS_GUIDE.md) - General RLS guide
- [BYPASS_ACCESS_CONTROLS_GUIDE.md](./BYPASS_ACCESS_CONTROLS_GUIDE.md) - Service role access

## Summary

This investigation and migration:
✅ Identifies all existing RLS policies and migrations
✅ Provides comprehensive cleanup of conflicting policies
✅ Creates consistent, well-named policies for all storage operations
✅ Ensures proper bucket configuration for production use
✅ Includes verification queries for testing
✅ Documents security considerations and design decisions
✅ Provides troubleshooting guidance

**Status**: ✅ Ready for deployment
**Testing**: Required before marking as complete
**Migration File**: `supabase/migrations/20251115133000_verify_and_fix_lovable_rls.sql`
