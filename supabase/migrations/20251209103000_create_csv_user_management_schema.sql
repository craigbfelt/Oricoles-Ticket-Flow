-- Create CSV-based User Management Schema
-- This migration creates tables for managing users via CSV imports instead of dynamic Intune sync

-- =====================================================
-- 1. MASTER USER LIST TABLE
-- =====================================================
-- This table stores the fixed/static user list imported from CSV (RDP/VPN spreadsheets)
CREATE TABLE IF NOT EXISTS public.master_user_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  job_title TEXT,
  department TEXT,
  branch_id UUID REFERENCES public.branches(id),
  vpn_username TEXT,
  rdp_username TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'csv_import', -- 'csv_import', 'manual', 'intune'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  imported_at TIMESTAMPTZ,
  imported_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_master_user_list_email ON public.master_user_list(email);
CREATE INDEX IF NOT EXISTS idx_master_user_list_tenant ON public.master_user_list(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_user_list_active ON public.master_user_list(is_active);

-- Enable RLS
ALTER TABLE public.master_user_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies for master_user_list
CREATE POLICY "Staff can view all master users" ON public.master_user_list
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can view own master user by email" ON public.master_user_list
  FOR SELECT TO authenticated
  USING (
    email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert master users" ON public.master_user_list
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update master users" ON public.master_user_list
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete master users" ON public.master_user_list
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_master_user_list_updated_at
  BEFORE UPDATE ON public.master_user_list
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 2. DEVICE USER ASSIGNMENTS TABLE
-- =====================================================
-- Tracks which devices are assigned to which users using serial numbers
CREATE TABLE IF NOT EXISTS public.device_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL,
  user_email TEXT NOT NULL,
  device_name TEXT,
  device_model TEXT,
  assignment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  assignment_source TEXT DEFAULT 'auto', -- 'auto', 'manual', 'intune_sync'
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Create partial unique index for current assignments only
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_assignments_current_unique 
  ON public.device_user_assignments(device_serial_number) 
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_device_assignments_serial ON public.device_user_assignments(device_serial_number);
CREATE INDEX IF NOT EXISTS idx_device_assignments_email ON public.device_user_assignments(user_email);
CREATE INDEX IF NOT EXISTS idx_device_assignments_tenant ON public.device_user_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_current ON public.device_user_assignments(is_current);

-- Enable RLS
ALTER TABLE public.device_user_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_user_assignments
CREATE POLICY "Staff can view all device assignments" ON public.device_user_assignments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can view own device assignments" ON public.device_user_assignments
  FOR SELECT TO authenticated
  USING (
    user_email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert device assignments" ON public.device_user_assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update device assignments" ON public.device_user_assignments
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete device assignments" ON public.device_user_assignments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_device_user_assignments_updated_at
  BEFORE UPDATE ON public.device_user_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 3. DEVICE CHANGE HISTORY TABLE
-- =====================================================
-- Tracks changes in device assignments to detect reassignments and replacements
CREATE TABLE IF NOT EXISTS public.device_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'new_device', 'reassignment', 'replacement', 'username_change', 'email_change'
  old_user_email TEXT,
  new_user_email TEXT,
  old_username TEXT,
  new_username TEXT,
  detected_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_device_changes_serial ON public.device_change_history(device_serial_number);
CREATE INDEX IF NOT EXISTS idx_device_changes_reviewed ON public.device_change_history(reviewed);
CREATE INDEX IF NOT EXISTS idx_device_changes_tenant ON public.device_change_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_changes_type ON public.device_change_history(change_type);
CREATE INDEX IF NOT EXISTS idx_device_changes_detected ON public.device_change_history(detected_at DESC);

-- Enable RLS
ALTER TABLE public.device_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_change_history
CREATE POLICY "Staff can view all device changes" ON public.device_change_history
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can insert device changes" ON public.device_change_history
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update device changes" ON public.device_change_history
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete device changes" ON public.device_change_history
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. MANUAL DEVICES TABLE
-- =====================================================
-- For thin clients and other devices not in Intune
CREATE TABLE IF NOT EXISTS public.manual_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial_number TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT DEFAULT 'thin_client', -- 'thin_client', 'desktop', 'laptop', 'other'
  device_model TEXT,
  assigned_user_email TEXT,
  connection_type TEXT, -- 'rdp', 'vpn', 'direct'
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_manual_devices_serial ON public.manual_devices(device_serial_number);
CREATE INDEX IF NOT EXISTS idx_manual_devices_email ON public.manual_devices(assigned_user_email);
CREATE INDEX IF NOT EXISTS idx_manual_devices_tenant ON public.manual_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manual_devices_active ON public.manual_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_manual_devices_type ON public.manual_devices(device_type);

-- Enable RLS
ALTER TABLE public.manual_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manual_devices
CREATE POLICY "Staff can view all manual devices" ON public.manual_devices
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can view own manual devices" ON public.manual_devices
  FOR SELECT TO authenticated
  USING (
    assigned_user_email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert manual devices" ON public.manual_devices
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update manual devices" ON public.manual_devices
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete manual devices" ON public.manual_devices
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_manual_devices_updated_at
  BEFORE UPDATE ON public.manual_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.master_user_list IS 'Fixed/static user list imported from CSV (RDP/VPN spreadsheets). This is the source of truth for who should be in the system.';
COMMENT ON TABLE public.device_user_assignments IS 'Tracks which devices (by serial number) are assigned to which users. Used for matching Intune devices to users.';
COMMENT ON TABLE public.device_change_history IS 'Audit log of device assignment changes detected by comparing Intune data with master user list.';
COMMENT ON TABLE public.manual_devices IS 'Devices not in Intune (e.g., thin clients) that need to be manually tracked.';

COMMENT ON COLUMN public.master_user_list.source IS 'Origin of the user record: csv_import (from spreadsheet), manual (added via UI), intune (synced from M365)';
COMMENT ON COLUMN public.device_user_assignments.assignment_source IS 'How assignment was created: auto (detected from Intune), manual (user input), intune_sync (direct from M365)';
COMMENT ON COLUMN public.device_change_history.change_type IS 'Type of change: new_device, reassignment, replacement, username_change, email_change';
