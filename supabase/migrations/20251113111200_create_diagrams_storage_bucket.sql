-- Create the diagrams storage bucket for network diagrams, images, and document uploads
-- This bucket is used by multiple features:
-- - Company Network Diagrams
-- - Nymbis RDP Cloud diagrams  
-- - Branch-specific diagrams
-- - Document-extracted images
-- - PDF page images

-- Insert the diagrams bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diagrams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diagrams" ON storage.objects;

-- Create policy for authenticated users to upload diagrams
CREATE POLICY "Authenticated users can upload diagrams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diagrams');

-- Create policy for public read access to diagrams (since bucket is public)
CREATE POLICY "Public users can view diagrams"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagrams');

-- Create policy for authenticated users to update diagrams
CREATE POLICY "Authenticated users can update diagrams"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'diagrams')
WITH CHECK (bucket_id = 'diagrams');

-- Create policy for authenticated users to delete diagrams
CREATE POLICY "Authenticated users can delete diagrams"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diagrams');

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
