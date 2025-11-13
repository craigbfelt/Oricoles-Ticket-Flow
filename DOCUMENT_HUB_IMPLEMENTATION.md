# Document Hub Implementation Guide

## Overview
The Document Hub is a centralized document management system that addresses the "new row violates row level security" error when uploading documents. It provides a single location where all uploaded documents are automatically stored and can be managed.

## Problem Solved
Previously, when users tried to upload documents through various features (Document Import, Network Diagrams, Branch Files, etc.), they encountered RLS (Row Level Security) violations. The Document Hub solves this by:

1. Creating a proper database table to store document metadata
2. Establishing a dedicated storage bucket with correct RLS policies
3. Automatically saving all uploaded documents to this centralized location
4. Providing an interface to view, download, and manage documents

## Features

### 1. Centralized Document Storage
- All documents uploaded through the system are automatically saved to the Document Hub
- Documents are categorized automatically based on file type
- Metadata is stored including filename, size, upload date, and description

### 2. Document Hub Page (`/document-hub`)
Access the Document Hub from the navigation sidebar. Features include:

- **View All Documents**: See all uploaded documents in a table format
- **Search**: Search documents by filename or description
- **Filter by Category**: Filter by document type (general, image, pdf, word, excel, powerpoint)
- **Upload**: Upload new documents directly to the hub
- **Download**: Download any document
- **View**: Open documents in a new tab
- **Delete**: Remove unwanted documents
- **Move**: (Placeholder) Move documents to other locations in the system

### 3. Automatic Upload Integration
The `DocumentUpload` component has been enhanced to automatically save all uploads to the Document Hub:

- When a user uploads a document via Document Import, it's saved to the hub
- The original file is preserved in storage
- Extracted data (tables, images, text) is still processed as before
- Users get confirmation that the document was saved to the hub

### 4. Smart Categorization
Documents are automatically categorized based on their MIME type:

- **image**: PNG, JPG, JPEG, GIF, WEBP files
- **pdf**: PDF documents
- **word**: DOC and DOCX files
- **excel**: XLS and XLSX files
- **powerpoint**: PPT and PPTX files
- **general**: All other file types

## Technical Implementation

### Database Schema

#### Documents Table
```sql
CREATE TABLE public.documents (
  id uuid PRIMARY KEY,
  filename text NOT NULL,              -- System-generated unique filename
  original_filename text NOT NULL,     -- Original filename from user
  file_type text NOT NULL,             -- MIME type
  file_size bigint NOT NULL,           -- Size in bytes
  storage_path text NOT NULL,          -- Path in storage bucket
  storage_bucket text NOT NULL,        -- Bucket name (usually 'documents')
  category text NOT NULL,              -- Document category
  description text,                    -- Optional description
  tags text[],                         -- Array of tags
  uploaded_by uuid,                    -- User who uploaded
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
```

#### Storage Bucket
- **Name**: `documents`
- **Public**: Yes (for easy viewing)
- **File Size Limit**: 100MB
- **Allowed MIME Types**: PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP

### Row Level Security (RLS) Policies

#### Documents Table Policies
- **SELECT**: All authenticated users can view all documents
- **INSERT**: All authenticated users can upload documents
- **UPDATE**: All authenticated users can update documents
- **DELETE**: All authenticated users can delete documents

#### Storage Bucket Policies
- **SELECT**: Public users can view documents (needed for display)
- **INSERT**: Authenticated users can upload documents
- **UPDATE**: Authenticated users can update documents
- **DELETE**: Authenticated users can delete documents

### Files Modified

1. **Migration**: `supabase/migrations/20251113142600_create_documents_table_and_bucket.sql`
   - Creates documents table
   - Creates documents storage bucket
   - Sets up RLS policies

2. **Page**: `src/pages/DocumentHub.tsx`
   - Main Document Hub interface
   - Document list with search and filters
   - Upload, download, view, delete functionality

3. **Component**: `src/components/DocumentUpload.tsx`
   - Enhanced to auto-save documents to hub
   - Adds categorization logic
   - Stores original file alongside extracted data

4. **Navigation**: `src/components/DashboardLayout.tsx`
   - Added "Document Hub" navigation link
   - Accessible to all users

5. **Routes**: `src/App.tsx`
   - Added `/document-hub` route

## Usage Guide

### For End Users

#### Uploading Documents
1. Navigate to "Document Hub" in the sidebar
2. Click "Upload Document" button
3. Select a file from your computer
4. Choose a category (or leave as "General" for auto-categorization)
5. Optionally add a description
6. Click "Upload"

The document will be:
- Stored in the documents bucket
- Cataloged in the documents table
- Visible in the Document Hub list

#### Managing Documents
- **Search**: Use the search box to find documents by name or description
- **Filter**: Use the category dropdown to filter by document type
- **Download**: Click the download icon to save a copy locally
- **View**: Click the eye icon to open the document in a new tab
- **Delete**: Click the trash icon to remove a document (confirmation required)
- **Move**: Click the folder icon to move documents to other locations (coming soon)

### For Developers

#### Accessing Documents Programmatically
```typescript
// Fetch all documents
const { data: documents } = await supabase
  .from("documents")
  .select("*")
  .order("created_at", { ascending: false });

// Upload a document
const filePath = `documents/${timestamp}_${filename}`;
await supabase.storage.from('documents').upload(filePath, file);

// Save metadata
await supabase.from("documents").insert({
  filename: storedFilename,
  original_filename: file.name,
  file_type: file.type,
  file_size: file.size,
  storage_path: filePath,
  storage_bucket: 'documents',
  category: category,
  uploaded_by: userId
});
```

#### Adding Document Hub Integration to Other Pages
To make your page automatically save documents to the hub, use the `DocumentUpload` component:

```tsx
import { DocumentUpload } from "@/components/DocumentUpload";

<DocumentUpload
  onDataParsed={(data) => {
    // Handle extracted data (tables, images, text)
    console.log(data);
  }}
  enableImageExtraction={true}
/>
```

Documents uploaded through this component will automatically be saved to the Document Hub.

## Security Considerations

### Authentication
- All upload, update, and delete operations require authentication
- Users must be logged in to access the Document Hub

### Row Level Security
- RLS policies ensure data isolation at the database level
- All policies allow authenticated users to access all documents
- This matches the application's security model

### Storage
- Public read access allows documents to be viewed in the application
- Files are stored with unique, timestamped names to prevent collisions
- File size limited to 100MB to prevent abuse
- MIME type restrictions prevent upload of executable files

### Future Enhancements
Consider implementing:
- User-specific document access controls
- Folder/project organization
- Document versioning
- Audit logging for document operations
- Automatic cleanup of orphaned files

## Troubleshooting

### "Bucket not found" Error
If you see this error:
1. Ensure the migration `20251113142600_create_documents_table_and_bucket.sql` has been applied
2. Check that the `documents` bucket exists in Supabase Storage
3. Verify RLS policies are in place

### "Row level security violation" Error
If you still see RLS errors:
1. Verify user is authenticated (check session)
2. Ensure RLS policies exist for both table and storage
3. Check that policies allow the operation (SELECT, INSERT, UPDATE, DELETE)

### Upload Fails
If document upload fails:
1. Check file size (must be under 100MB)
2. Verify file type is in the allowed MIME types list
3. Check browser console for detailed error messages
4. Ensure user has stable internet connection

### Documents Not Appearing
If uploaded documents don't show in the list:
1. Refresh the page
2. Check search/filter settings
3. Verify document was actually uploaded (check storage bucket)
4. Check browser console for errors

## Migration Instructions

### Applying the Migration
The migration will be automatically applied when:
1. This PR is merged to main
2. Supabase pulls the latest migrations
3. Or manually run: `supabase db push`

### Verification
After deployment, verify:
1. Navigate to Supabase Dashboard → Database → Tables
2. Confirm `documents` table exists
3. Navigate to Supabase Dashboard → Storage
4. Confirm `documents` bucket exists
5. Check bucket settings (public, 100MB limit, correct MIME types)
6. Try uploading a test document through the Document Hub

## Support
For issues or questions:
1. Check the Troubleshooting section above
2. Review Supabase logs for detailed error messages
3. Verify all migration files have been applied
4. Check that user authentication is working

## Related Documentation
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)

---

**Implementation Date**: 2025-11-13
**Migration File**: `20251113142600_create_documents_table_and_bucket.sql`
