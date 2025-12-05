-- Migration: Secure Credential Storage
-- This migration encrypts passwords in the vpn_rdp_credentials table at rest
-- while ensuring passwords remain accessible (decrypted) when queried by authorized users
-- and restricts access to admin/support_staff roles only

-- ============================================================================
-- STEP 1: Enable pgcrypto extension for encryption functions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 2: Create helper functions for encryption/decryption
-- ============================================================================

-- Function to get the encryption key (uses environment variable or Vault)
CREATE OR REPLACE FUNCTION get_credential_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Try to get from Vault first (if available)
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'credential_encryption_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    encryption_key := NULL;
  END;
  
  -- Fallback to a generated key if Vault is not configured
  -- WARNING: For production, always configure Supabase Vault with a strong key
  -- This fallback uses a hash-based approach for better security than a static string
  IF encryption_key IS NULL THEN
    -- Generate a more secure fallback using database OID and a salt
    -- This is still not as secure as a proper Vault key, but better than a static string
    encryption_key := encode(
      digest(
        'oricol_secure_fallback_' || current_database() || '_' || 
        (SELECT oid::text FROM pg_database WHERE datname = current_database()),
        'sha256'
      ),
      'hex'
    );
  END IF;
  
  RETURN encryption_key;
END;
$$;

-- Function to encrypt a password
CREATE OR REPLACE FUNCTION encrypt_credential(plain_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_password IS NULL OR plain_password = '' THEN
    RETURN plain_password;
  END IF;
  
  encryption_key := get_credential_encryption_key();
  
  -- Use pgp_sym_encrypt for symmetric encryption
  RETURN encode(pgp_sym_encrypt(plain_password, encryption_key), 'base64');
END;
$$;

-- Function to decrypt a password
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
  decrypted_value TEXT;
BEGIN
  IF encrypted_password IS NULL OR encrypted_password = '' THEN
    RETURN encrypted_password;
  END IF;
  
  encryption_key := get_credential_encryption_key();
  
  -- Use pgp_sym_decrypt for symmetric decryption
  BEGIN
    decrypted_value := pgp_sym_decrypt(decode(encrypted_password, 'base64'), encryption_key);
    RETURN decrypted_value;
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails, log warning and return NULL for security
    -- This prevents exposing encrypted data if the key is wrong
    RAISE WARNING 'Failed to decrypt credential: %', SQLERRM;
    RETURN NULL;
  END;
END;
$$;

-- ============================================================================
-- STEP 3: Add encrypted password column
-- ============================================================================

-- Add encrypted_password column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vpn_rdp_credentials' 
    AND column_name = 'encrypted_password'
  ) THEN
    ALTER TABLE public.vpn_rdp_credentials ADD COLUMN encrypted_password TEXT;
  END IF;
END $$;

-- Migrate existing plain text passwords to encrypted format
UPDATE public.vpn_rdp_credentials
SET encrypted_password = encrypt_credential(password)
WHERE encrypted_password IS NULL AND password IS NOT NULL AND password != '***ENCRYPTED***';

-- ============================================================================
-- STEP 4: Create trigger to auto-encrypt passwords on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION encrypt_credential_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt the password if it's being set/changed and not already a placeholder
  IF NEW.password IS NOT NULL AND NEW.password != '' AND NEW.password != '***ENCRYPTED***' THEN
    NEW.encrypted_password := encrypt_credential(NEW.password);
    -- Store a placeholder in the original column to indicate encryption
    NEW.password := '***ENCRYPTED***';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS encrypt_credential_trigger ON public.vpn_rdp_credentials;

-- Create trigger for insert and update
CREATE TRIGGER encrypt_credential_trigger
BEFORE INSERT OR UPDATE ON public.vpn_rdp_credentials
FOR EACH ROW
EXECUTE FUNCTION encrypt_credential_on_change();

-- ============================================================================
-- STEP 5: Create a secure function to get decrypted credentials
-- This function returns credentials with passwords decrypted for authorized users
-- ============================================================================

CREATE OR REPLACE FUNCTION get_decrypted_credentials(p_service_type TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  password TEXT,
  service_type TEXT,
  email TEXT,
  notes TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin or support_staff role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'support_staff')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or support_staff role';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.username,
    CASE 
      WHEN c.encrypted_password IS NOT NULL THEN decrypt_credential(c.encrypted_password)
      ELSE c.password
    END as password,
    c.service_type,
    c.email,
    c.notes,
    c.tenant_id,
    c.created_at,
    c.updated_at
  FROM public.vpn_rdp_credentials c
  WHERE p_service_type IS NULL OR c.service_type = p_service_type
  ORDER BY c.username;
END;
$$;

-- ============================================================================
-- STEP 6: Update RLS policies to restrict access to admin/support_staff only
-- ============================================================================

-- Drop all existing policies on vpn_rdp_credentials
DROP POLICY IF EXISTS "Authenticated users can view vpn_rdp_credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can insert vpn_rdp_credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can update vpn_rdp_credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can delete vpn_rdp_credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can manage vpn_rdp_credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins and support can view credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins can insert credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins can update credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins can delete credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admin and support can view credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admin and support can insert credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admin and support can update credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admin and support can delete credentials" ON public.vpn_rdp_credentials;

-- Helper function to check if user has admin or support_staff role
CREATE OR REPLACE FUNCTION is_admin_or_support()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'support_staff')
  );
$$;

-- Create restricted policies - only admin and support_staff can access
CREATE POLICY "Staff can view credentials"
ON public.vpn_rdp_credentials FOR SELECT
TO authenticated
USING (is_admin_or_support());

CREATE POLICY "Staff can insert credentials"
ON public.vpn_rdp_credentials FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_support());

CREATE POLICY "Staff can update credentials"
ON public.vpn_rdp_credentials FOR UPDATE
TO authenticated
USING (is_admin_or_support())
WITH CHECK (is_admin_or_support());

CREATE POLICY "Staff can delete credentials"
ON public.vpn_rdp_credentials FOR DELETE
TO authenticated
USING (is_admin_or_support());

-- ============================================================================
-- STEP 7: Add comment documenting the security setup
-- ============================================================================

COMMENT ON TABLE public.vpn_rdp_credentials IS 'Stores VPN and RDP credentials with encrypted passwords. Access restricted to admin and support_staff roles only. Use get_decrypted_credentials() function to retrieve passwords.';
COMMENT ON COLUMN public.vpn_rdp_credentials.password IS 'Contains placeholder after encryption. Use get_decrypted_credentials() to get actual password.';
COMMENT ON COLUMN public.vpn_rdp_credentials.encrypted_password IS 'PGP encrypted password using pgcrypto. Automatically decrypted by get_decrypted_credentials() function.';

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- For production use, set up a strong encryption key in Supabase Vault:
-- 
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Run: SELECT vault.create_secret('credential_encryption_key', 'your-strong-32-char-key-here');
-- 
-- The migration will automatically use the Vault key if available.
--
-- To retrieve decrypted credentials in your app:
-- SELECT * FROM get_decrypted_credentials('RDP');  -- For RDP only
-- SELECT * FROM get_decrypted_credentials('VPN');  -- For VPN only
-- SELECT * FROM get_decrypted_credentials();       -- For all credentials
-- ============================================================================
