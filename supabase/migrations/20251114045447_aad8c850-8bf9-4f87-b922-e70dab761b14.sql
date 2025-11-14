-- Ensure storage buckets are public to allow uploads
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('documents', 'diagrams');