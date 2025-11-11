-- Add deleted_manually column to track manually deleted records
ALTER TABLE public.hardware_inventory 
ADD COLUMN IF NOT EXISTS deleted_manually boolean DEFAULT false;

ALTER TABLE public.directory_users 
ADD COLUMN IF NOT EXISTS deleted_manually boolean DEFAULT false;

ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS deleted_manually boolean DEFAULT false;

-- Create function to remove duplicates from hardware_inventory
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

-- Create function to remove duplicates from directory_users
CREATE OR REPLACE FUNCTION public.remove_user_duplicates()
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
             PARTITION BY aad_id 
             ORDER BY created_at DESC
           ) as rn
    FROM public.directory_users
    WHERE aad_id IS NOT NULL 
    AND deleted_manually = false
  )
  DELETE FROM public.directory_users
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create function to remove duplicates from licenses
CREATE OR REPLACE FUNCTION public.remove_license_duplicates()
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
             PARTITION BY license_name, vendor 
             ORDER BY created_at DESC
           ) as rn
    FROM public.licenses
    WHERE deleted_manually = false
  )
  DELETE FROM public.licenses
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;