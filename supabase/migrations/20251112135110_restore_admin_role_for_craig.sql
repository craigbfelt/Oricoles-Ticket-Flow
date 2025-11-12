-- Restore admin role for craig@zerobitone.co.za
-- This migration ensures the user craig@zerobitone.co.za has the admin role

-- Insert admin role for craig@zerobitone.co.za based on their email
-- Using ON CONFLICT to handle case where role might already exist
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.user_id,
  'admin'::app_role
FROM public.profiles p
WHERE p.email = 'craig@zerobitone.co.za'
ON CONFLICT (user_id, role) DO NOTHING;
