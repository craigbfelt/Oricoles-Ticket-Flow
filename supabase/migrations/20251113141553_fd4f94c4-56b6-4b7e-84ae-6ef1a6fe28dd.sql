-- Create the 'diagrams' storage bucket for storing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagrams',
  'diagrams',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;