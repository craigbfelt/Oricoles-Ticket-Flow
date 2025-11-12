-- Fix RLS policies to properly include CEO role for all tables
-- CEOs should have full access to everything EXCEPT System Users management (user_roles table)

-- Assets: Admin and CEO can manage, others can only view assigned
DROP POLICY IF EXISTS "Users can view assigned assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can create assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;

CREATE POLICY "Users can view assigned assets or admins/ceos can view all"
  ON public.assets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assigned_to 
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can create assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can update assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can delete assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  );

-- Tickets: Support staff, admin, and CEO can view/manage all tickets
DROP POLICY IF EXISTS "Support staff can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Support staff can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

CREATE POLICY "Support staff, admins, and CEOs can view all tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Support staff, admins, and CEOs can update all tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can delete tickets"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  );

-- Ticket comments: Include CEO access
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tickets" ON public.ticket_comments;

CREATE POLICY "Users can view comments on accessible tickets"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR tickets.assigned_to = auth.uid())
    ) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Users can create comments on accessible tickets"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR tickets.assigned_to = auth.uid())
    ) 
    OR public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'support_staff'::app_role)
  );

-- Jobs: Include CEO access
DROP POLICY IF EXISTS "Admins and support can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins and support can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins and support can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;

CREATE POLICY "Admins, CEOs, and support can view all jobs"
  ON public.jobs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins, CEOs, and support can create jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins, CEOs, and support can update jobs"
  ON public.jobs FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can delete jobs"
  ON public.jobs FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Job update requests: Include CEO access
DROP POLICY IF EXISTS "Admins and support can view update requests" ON public.job_update_requests;
DROP POLICY IF EXISTS "Admins and support can update requests" ON public.job_update_requests;

CREATE POLICY "Admins, CEOs, and support can view update requests"
  ON public.job_update_requests FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins, CEOs, and support can update requests"
  ON public.job_update_requests FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

-- Maintenance requests: Include CEO access
DROP POLICY IF EXISTS "Admins and support can view all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins and support can update requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON public.maintenance_requests;

CREATE POLICY "Admins, CEOs, and support can view all requests"
  ON public.maintenance_requests FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins, CEOs, and support can update requests"
  ON public.maintenance_requests FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY "Admins and CEOs can delete requests"
  ON public.maintenance_requests FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Chat messages: Include CEO for support replies
DROP POLICY IF EXISTS "Support staff can create support replies" ON public.chat_messages;

CREATE POLICY "Support staff, admins, and CEOs can create support replies"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    is_support_reply = true AND 
    (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'support_staff'::app_role)
    )
  );

-- Add comment explaining the access control model
COMMENT ON TYPE app_role IS 'Application roles with hierarchy:
- admin: Full system access including user management
- ceo: Full access to all data and operations EXCEPT user_roles management
- support_staff: Access to tickets, users (view only), jobs, maintenance, reports, VPN, RDP
- user: Basic access to own tickets and remote support';

-- Ensure profiles policies allow CEO access
-- Keep existing policies that were updated in 20251112160000_allow_ceo_view_all_profiles.sql
-- (These are already correct with CEO included)

-- Ensure ticket_time_logs allows CEO access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view time logs"
  ON public.ticket_time_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can create time logs"
  ON public.ticket_time_logs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can update time logs"
  ON public.ticket_time_logs FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

-- Branches: Allow CEO full access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view branches"
  ON public.branches FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can create branches"
  ON public.branches FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can update branches"
  ON public.branches FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can delete branches"
  ON public.branches FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Hardware inventory: Allow CEO full access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view hardware"
  ON public.hardware_inventory FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can create hardware"
  ON public.hardware_inventory FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can update hardware"
  ON public.hardware_inventory FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can delete hardware"
  ON public.hardware_inventory FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Software inventory: Allow CEO full access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view software"
  ON public.software_inventory FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can create software"
  ON public.software_inventory FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can update software"
  ON public.software_inventory FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can delete software"
  ON public.software_inventory FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Licenses: Allow CEO full access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view licenses"
  ON public.licenses FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can create licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can update licenses"
  ON public.licenses FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can delete licenses"
  ON public.licenses FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- VPN/RDP credentials: Allow CEO, admin, and support staff to view
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view credentials"
  ON public.vpn_rdp_credentials FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can create credentials"
  ON public.vpn_rdp_credentials FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can update credentials"
  ON public.vpn_rdp_credentials FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can delete credentials"
  ON public.vpn_rdp_credentials FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Remote sessions: Allow CEO, admin, and support staff access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view sessions"
  ON public.remote_sessions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can update sessions"
  ON public.remote_sessions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

-- Provider emails: Allow CEO, admin, and support staff access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view provider emails"
  ON public.provider_emails FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can create provider emails"
  ON public.provider_emails FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can update provider emails"
  ON public.provider_emails FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

-- Directory users (Microsoft 365): Allow CEO access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view directory users"
  ON public.directory_users FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can manage directory users"
  ON public.directory_users FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Network devices: Allow CEO access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view network devices"
  ON public.network_devices FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can manage network devices"
  ON public.network_devices FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Internet connectivity: Allow CEO access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view connectivity"
  ON public.internet_connectivity FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can manage connectivity"
  ON public.internet_connectivity FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Network diagrams: Allow CEO access
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view diagrams"
  ON public.network_diagrams FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can manage diagrams"
  ON public.network_diagrams FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- Remote clients: Allow support staff, CEOs and admins to view
CREATE POLICY IF NOT EXISTS "Admins, CEOs, and support can view remote clients"
  ON public.remote_clients FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
    OR has_role(auth.uid(), 'support_staff'::app_role)
  );

CREATE POLICY IF NOT EXISTS "Admins and CEOs can manage remote clients"
  ON public.remote_clients FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'ceo'::app_role)
  );

-- CRITICAL: Ensure everyone can CREATE tickets
-- This was accidentally removed - all authenticated users should be able to create tickets
CREATE POLICY IF NOT EXISTS "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);
