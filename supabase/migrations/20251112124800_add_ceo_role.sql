-- Add 'ceo' to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ceo';

-- Add comment to document CEO role permissions
COMMENT ON TYPE app_role IS 'Application roles: admin (full access), ceo (view access to most features, cannot edit system users), support_staff (can manage tickets and view users), user (basic access)';
