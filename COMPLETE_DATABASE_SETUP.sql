-- ============================================================================
-- ORICOL HELPDESK - COMPLETE DATABASE SETUP
-- ============================================================================
-- 
-- This script sets up the complete Supabase database for the Oricol Helpdesk.
-- Run this in the Supabase SQL Editor to create all required tables, 
-- functions, triggers, and RLS policies.
-- 
-- HOW TO USE:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in the sidebar
-- 4. Click "New query"
-- 5. Paste this entire script
-- 6. Click "Run"
--
-- This script is IDEMPOTENT - safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- PART 1: ENUMS AND TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('active', 'maintenance', 'retired', 'disposed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'support_staff', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 2: CORE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================================
-- PART 3: TENANTS TABLE (Multi-tenancy support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 4: PROFILES AND USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role app_role DEFAULT 'user',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.global_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 5: TICKETS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status ticket_status DEFAULT 'open' NOT NULL,
  priority ticket_priority DEFAULT 'medium' NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT,
  branch TEXT,
  fault_type TEXT,
  user_email TEXT,
  error_code TEXT,
  time_spent_minutes INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ticket_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  minutes INTEGER NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: ASSETS AND INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_tag TEXT UNIQUE,
  category TEXT,
  model TEXT,
  serial_number TEXT,
  status asset_status DEFAULT 'active' NOT NULL,
  location TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchase_date DATE,
  warranty_expires DATE,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hardware_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  processor TEXT,
  ram_gb INTEGER,
  storage_gb INTEGER,
  os TEXT,
  os_version TEXT,
  assigned_to TEXT,
  location TEXT,
  branch TEXT,
  purchase_date DATE,
  warranty_expires DATE,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen TIMESTAMPTZ,
  notes TEXT,
  deleted_manually BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.hardware_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.software_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_name TEXT NOT NULL,
  version TEXT,
  vendor TEXT,
  license_key TEXT,
  license_type TEXT,
  installed_on UUID REFERENCES public.hardware_inventory(id),
  assigned_to TEXT,
  install_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.software_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_name TEXT NOT NULL,
  license_type TEXT NOT NULL,
  vendor TEXT NOT NULL,
  license_key TEXT,
  total_seats INTEGER NOT NULL,
  used_seats INTEGER NOT NULL DEFAULT 0,
  assigned_to TEXT,
  purchase_date DATE,
  renewal_date DATE,
  cost DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  deleted_manually BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: BRANCHES AND NETWORK INFRASTRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.network_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  ip_address TEXT,
  mac_address TEXT,
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'active',
  purchase_date DATE,
  warranty_expires DATE,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.network_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.network_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  diagram_name TEXT NOT NULL,
  diagram_url TEXT NOT NULL,
  description TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.network_diagrams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.internet_connectivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  isp TEXT DEFAULT '',
  connection_type TEXT,
  bandwidth_mbps TEXT,
  static_ip TEXT,
  router_model TEXT,
  router_serial TEXT,
  account_number TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_cost DECIMAL(10, 2),
  support_contact TEXT,
  support_phone TEXT,
  support_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.internet_connectivity ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cloud_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'azure',
  network_type TEXT DEFAULT 'vnet',
  description TEXT,
  image_path TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cloud_networks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 8: CRM SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'follow_up')),
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 9: DOCUMENTS AND FILE SHARING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'documents',
  category TEXT DEFAULT 'general',
  description TEXT,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.shared_folder_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.shared_folder_files ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.shared_folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.shared_folder_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_with_user_id UUID,
  shared_with_group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 10: JOBS AND MAINTENANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  client_name TEXT,
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.job_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  update_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_by UUID REFERENCES auth.users(id),
  requested_by_name TEXT,
  requested_by_email TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.job_update_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  device_id UUID,
  device_model TEXT,
  device_serial TEXT,
  current_user_id UUID,
  current_user_name TEXT,
  new_user_id UUID,
  new_user_name TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  pickup_date DATE,
  delivery_date DATE,
  courier_platform TEXT,
  courier_tracking_number TEXT,
  courier_booking_reference TEXT,
  courier_status TEXT,
  courier_cost DECIMAL(10, 2),
  requested_by UUID REFERENCES auth.users(id),
  requested_by_name TEXT,
  requested_by_email TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  internal_notes TEXT,
  zapier_webhook_triggered BOOLEAN DEFAULT false,
  zapier_response JSONB,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 11: REMOTE SUPPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.remote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  status TEXT DEFAULT 'pending',
  connection_type TEXT,
  device_info JSONB,
  connection_details JSONB,
  support_staff_id UUID REFERENCES auth.users(id),
  ticket_id UUID REFERENCES public.tickets(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.remote_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_token TEXT NOT NULL,
  computer_name TEXT NOT NULL,
  username TEXT NOT NULL,
  ip_address TEXT,
  os_version TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'pending',
  last_seen_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  registered_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.remote_clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  user_email TEXT,
  message TEXT NOT NULL,
  is_support_reply BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 12: VPN AND CREDENTIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vpn_rdp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.vpn_rdp_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 13: DIRECTORY AND PROVIDER INTEGRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.directory_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aad_id TEXT,
  display_name TEXT,
  email TEXT,
  user_principal_name TEXT,
  job_title TEXT,
  department TEXT,
  account_enabled BOOLEAN DEFAULT true,
  deleted_manually BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.directory_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.provider_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  email_type TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  request_data JSONB,
  staff_member_id UUID,
  staff_member_name TEXT,
  staff_member_email TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  confirmation_token TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  provider_notes TEXT,
  resend_count INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.provider_emails ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 14: IMPORT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  file_path TEXT,
  status TEXT DEFAULT 'pending',
  items_count INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  result_summary TEXT,
  error_message TEXT,
  error_details TEXT,
  branch_id UUID REFERENCES public.branches(id),
  uploader UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 15: PERMISSIONS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission_level TEXT DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.user_groups(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission_level TEXT DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 16: SCHEMA MIGRATIONS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 17: TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_tickets ON public.tickets;
DROP TRIGGER IF EXISTS set_updated_at_assets ON public.assets;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create triggers
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tickets
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 18: BASIC RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Tickets policies
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
CREATE POLICY "Authenticated users can view tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.tickets;
CREATE POLICY "Authenticated users can update tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete tickets"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Assets policies
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
CREATE POLICY "Authenticated users can view assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage assets" ON public.assets;
CREATE POLICY "Admins can manage assets"
  ON public.assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Documents policies
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
CREATE POLICY "Authenticated users can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Schema migrations policies
DROP POLICY IF EXISTS "Allow authenticated users to view migrations" ON public.schema_migrations;
CREATE POLICY "Allow authenticated users to view migrations"
  ON public.schema_migrations FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 19: STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('diagrams', 'diagrams', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for diagrams bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to diagrams" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to diagrams"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'diagrams');

DROP POLICY IF EXISTS "Allow public reads from diagrams" ON storage.objects;
CREATE POLICY "Allow public reads from diagrams"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'diagrams');

DROP POLICY IF EXISTS "Allow authenticated updates to diagrams" ON storage.objects;
CREATE POLICY "Allow authenticated updates to diagrams"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'diagrams');

DROP POLICY IF EXISTS "Allow authenticated deletes from diagrams" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from diagrams"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'diagrams');

-- ============================================================================
-- PART 20: DEFAULT TENANT
-- ============================================================================

INSERT INTO tenants (id, name, slug, is_active, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  true,
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONE!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - All core tables (profiles, tickets, assets, etc.)';
  RAISE NOTICE '  - CRM tables (companies, contacts, deals, activities)';
  RAISE NOTICE '  - Document and file sharing tables';
  RAISE NOTICE '  - Network and infrastructure tables';
  RAISE NOTICE '  - Jobs and maintenance tables';
  RAISE NOTICE '  - Remote support tables';
  RAISE NOTICE '  - Storage buckets (diagrams, documents)';
  RAISE NOTICE '  - RLS policies for security';
  RAISE NOTICE '  - Triggers for automatic timestamps';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create your first admin user by signing up';
  RAISE NOTICE '  2. Assign admin role to the user in user_roles table';
  RAISE NOTICE '  3. Start using the application!';
  RAISE NOTICE '============================================================';
END $$;
