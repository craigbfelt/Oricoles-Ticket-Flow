-- Ensure the remove_hardware_duplicates function exists
-- This migration is idempotent and can be run multiple times safely

-- Ensure deleted_manually column exists in hardware_inventory
ALTER TABLE public.hardware_inventory 
ADD COLUMN IF NOT EXISTS deleted_manually boolean DEFAULT false;

-- Create or replace the function to remove duplicates from hardware_inventory
CREATE OR REPLACE FUNCTION public.remove_hardware_duplicates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY serial_number 
             ORDER BY created_at DESC
           ) as rn
    FROM public.hardware_inventory
    WHERE serial_number IS NOT NULL 
    AND serial_number != ''
    AND deleted_manually = false
  )
  DELETE FROM public.hardware_inventory
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.remove_hardware_duplicates() TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION public.remove_hardware_duplicates() IS 
'Removes duplicate hardware inventory records based on serial_number, keeping the most recent entry';
