-- Verification Query: Check for Unauthorized Admin Role Assignments
-- 
-- This query helps identify if anyone exploited the privilege escalation vulnerability
-- that was fixed in migration 20251117102836_e9e402df-9138-41a1-874c-39dc729c3cbd.sql
--
-- The vulnerability allowed any authenticated user to grant themselves admin role
-- due to overly permissive RLS policies on the user_roles table.
--
-- HOW TO USE:
-- Run this query in your Supabase SQL Editor or via CLI to check for suspicious admin role assignments.
-- Look for:
--   1. Recent admin role creations (created_at after the app went live)
--   2. Admin roles for users who shouldn't have admin access
--   3. Multiple admin role assignments around the same time (potential mass exploitation)
--
-- EXPECTED RESULTS:
-- Review the output and verify that each admin user should legitimately have admin access.
-- If you find unauthorized admins, you can revoke their access by:
-- DELETE FROM user_roles WHERE user_id = '<unauthorized_user_id>' AND role = 'admin';

SELECT 
  u.email,
  u.id as user_id,
  ur.role,
  ur.created_at as role_assigned_at,
  ur.id as role_assignment_id,
  -- Calculate days since role was assigned
  EXTRACT(DAY FROM (NOW() - ur.created_at)) as days_since_assignment
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- Additional query: Check for suspicious patterns (multiple admin assignments in short time)
-- Uncomment to run:
/*
SELECT 
  DATE_TRUNC('hour', created_at) as assignment_hour,
  COUNT(*) as admin_assignments_in_hour
FROM public.user_roles
WHERE role = 'admin'
GROUP BY DATE_TRUNC('hour', created_at)
HAVING COUNT(*) > 1
ORDER BY assignment_hour DESC;
*/
