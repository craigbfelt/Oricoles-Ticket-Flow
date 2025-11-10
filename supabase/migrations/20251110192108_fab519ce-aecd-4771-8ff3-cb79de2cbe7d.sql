-- Add branch and fault type fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS branch text,
ADD COLUMN IF NOT EXISTS fault_type text,
ADD COLUMN IF NOT EXISTS user_email text,
ADD COLUMN IF NOT EXISTS error_code text;