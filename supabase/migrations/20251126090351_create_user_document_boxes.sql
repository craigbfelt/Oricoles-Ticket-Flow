-- Create user_document_boxes table to track user document folders with sequential numbers
CREATE TABLE IF NOT EXISTS public.user_document_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  box_number INTEGER NOT NULL UNIQUE,
  display_name TEXT,
  document_count INTEGER NOT NULL DEFAULT 0,
  total_storage_bytes BIGINT NOT NULL DEFAULT 0,
  last_upload_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create sequence for box numbers (starting at 1)
CREATE SEQUENCE IF NOT EXISTS public.user_box_number_seq START WITH 1 INCREMENT BY 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_document_boxes_user_id ON public.user_document_boxes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_document_boxes_box_number ON public.user_document_boxes(box_number);

-- Enable RLS on user_document_boxes table
ALTER TABLE public.user_document_boxes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_document_boxes
-- All authenticated users can view all boxes (for the grid display)
CREATE POLICY "Authenticated users can view all document boxes"
  ON public.user_document_boxes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own box record
CREATE POLICY "Users can insert own document box"
  ON public.user_document_boxes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own box record
CREATE POLICY "Users can update own document box"
  ON public.user_document_boxes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update any box records
CREATE POLICY "Admins can update all document boxes"
  ON public.user_document_boxes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any box records
CREATE POLICY "Admins can delete document boxes"
  ON public.user_document_boxes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_user_document_boxes_updated_at
  BEFORE UPDATE ON public.user_document_boxes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create user box
CREATE OR REPLACE FUNCTION public.get_or_create_user_box(p_user_id UUID)
RETURNS public.user_document_boxes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.user_document_boxes;
  v_profile public.profiles;
BEGIN
  -- Check if box exists
  SELECT * INTO v_box FROM public.user_document_boxes WHERE user_id = p_user_id;
  
  IF v_box.id IS NOT NULL THEN
    RETURN v_box;
  END IF;
  
  -- Get user profile for display name
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  
  -- Create new box with next sequence number
  INSERT INTO public.user_document_boxes (user_id, box_number, display_name)
  VALUES (
    p_user_id,
    nextval('public.user_box_number_seq'),
    COALESCE(v_profile.full_name, 'User')
  )
  RETURNING * INTO v_box;
  
  RETURN v_box;
END;
$$;

-- Function to update user box stats when document is uploaded
CREATE OR REPLACE FUNCTION public.update_user_box_on_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_box public.user_document_boxes;
BEGIN
  -- Get or create user box
  SELECT * INTO v_box FROM public.get_or_create_user_box(NEW.uploaded_by);
  
  -- Update box stats
  UPDATE public.user_document_boxes
  SET 
    document_count = document_count + 1,
    total_storage_bytes = total_storage_bytes + COALESCE(NEW.file_size, 0),
    last_upload_at = now(),
    updated_at = now()
  WHERE user_id = NEW.uploaded_by;
  
  RETURN NEW;
END;
$$;

-- Function to update user box stats when document is deleted
CREATE OR REPLACE FUNCTION public.update_user_box_on_document_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update box stats
  UPDATE public.user_document_boxes
  SET 
    document_count = GREATEST(document_count - 1, 0),
    total_storage_bytes = GREATEST(total_storage_bytes - COALESCE(OLD.file_size, 0), 0),
    updated_at = now()
  WHERE user_id = OLD.uploaded_by;
  
  RETURN OLD;
END;
$$;

-- Create triggers on documents table
DROP TRIGGER IF EXISTS update_user_box_on_document_insert ON public.documents;
CREATE TRIGGER update_user_box_on_document_insert
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_box_on_document_upload();

DROP TRIGGER IF EXISTS update_user_box_on_document_delete ON public.documents;
CREATE TRIGGER update_user_box_on_document_delete
  BEFORE DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_box_on_document_delete();

-- Initialize boxes for existing users who have uploaded documents
INSERT INTO public.user_document_boxes (user_id, box_number, display_name, document_count, total_storage_bytes, last_upload_at)
SELECT 
  d.uploaded_by,
  nextval('public.user_box_number_seq'),
  COALESCE(p.full_name, 'User'),
  COUNT(d.id),
  COALESCE(SUM(d.file_size), 0),
  MAX(d.created_at)
FROM public.documents d
LEFT JOIN public.profiles p ON d.uploaded_by = p.id
WHERE d.uploaded_by IS NOT NULL
GROUP BY d.uploaded_by, p.full_name
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.user_document_boxes IS 'Tracks user document folders with sequential box numbers for the Document Hub';
COMMENT ON COLUMN public.user_document_boxes.box_number IS 'Unique sequential number assigned to each user for their document box';
COMMENT ON COLUMN public.user_document_boxes.display_name IS 'Display name for the box (usually user full name)';
COMMENT ON COLUMN public.user_document_boxes.document_count IS 'Number of documents uploaded by this user';
COMMENT ON COLUMN public.user_document_boxes.total_storage_bytes IS 'Total storage used by user documents in bytes';
