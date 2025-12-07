-- Add branch_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
