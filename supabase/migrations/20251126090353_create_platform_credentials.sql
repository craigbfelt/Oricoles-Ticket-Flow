-- Create platform_credentials table for storing credentials across different platforms
-- SECURITY NOTE: Passwords are stored as-is in this version. 
-- For production deployment, consider implementing:
-- 1. Application-level encryption before storing
-- 2. pgcrypto extension for database-level encryption
-- 3. Vault integration for secrets management
CREATE TABLE IF NOT EXISTS public.platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- bluewave, sage, microsoft365, active_directory, qwerti, general
  provider TEXT NOT NULL, -- microsoft365, qwerti, active_directory, oricol_rdp, sage, bluewave, other
  credential_type TEXT NOT NULL, -- rdp, active_directory, email, api, database, admin, other
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- SECURITY: Should be encrypted in production environment
  email TEXT,
  server_url TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform ON public.platform_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_provider ON public.platform_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_type ON public.platform_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_is_active ON public.platform_credentials(is_active);

-- Enable RLS
ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins and CEO can view credentials (sensitive data)
CREATE POLICY "Admins can view all platform credentials"
  ON public.platform_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
    )
  );

-- Only admins can insert credentials
CREATE POLICY "Admins can insert platform credentials"
  ON public.platform_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update credentials
CREATE POLICY "Admins can update platform credentials"
  ON public.platform_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete credentials
CREATE POLICY "Admins can delete platform credentials"
  ON public.platform_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_platform_credentials_updated_at
  BEFORE UPDATE ON public.platform_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.platform_credentials IS 'Stores login credentials for various platforms like RDP, Active Directory, Email, etc.';
COMMENT ON COLUMN public.platform_credentials.platform IS 'The platform/page this credential belongs to (bluewave, sage, microsoft365, etc.)';
COMMENT ON COLUMN public.platform_credentials.provider IS 'The service provider (Microsoft 365, Qwerti, Active Directory, Oricol RDP, etc.)';
COMMENT ON COLUMN public.platform_credentials.credential_type IS 'Type of credential: rdp, active_directory, email, api, database, admin, other';
COMMENT ON COLUMN public.platform_credentials.password IS 'Password - should be encrypted in production environment';
