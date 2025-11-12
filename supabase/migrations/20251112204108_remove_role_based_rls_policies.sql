-- Remove all role-based RLS policies and replace with authenticated-only policies
-- This aligns database security with the UI changes that removed role checks
-- All authenticated users now have full access to all features

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and CEOs can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support staff can view all profiles for ticket assignment" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TICKETS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own or assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Support staff can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Support staff, admins, and CEOs can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update own or assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Support staff can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Support staff, admins, and CEOs can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins and CEOs can delete tickets" ON public.tickets;

CREATE POLICY "Authenticated users can view all tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tickets"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- TICKET COMMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.ticket_comments;

CREATE POLICY "Authenticated users can view all ticket comments"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ticket comments"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ticket comments"
  ON public.ticket_comments FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- TICKET TIME LOGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view time logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Admins, CEOs, and support can create time logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update time logs" ON public.ticket_time_logs;

CREATE POLICY "Authenticated users can view time logs"
  ON public.ticket_time_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create time logs"
  ON public.ticket_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update time logs"
  ON public.ticket_time_logs FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- ASSETS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view assigned assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view assigned assets or admins/ceos can view all" ON public.assets;
DROP POLICY IF EXISTS "Admins can create assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and CEOs can create assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and CEOs can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;
DROP POLICY IF EXISTS "Admins and CEOs can delete assets" ON public.assets;

CREATE POLICY "Authenticated users can view all assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and support can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins, CEOs, and support can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins and support can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins, CEOs, and support can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins and support can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins and CEOs can delete jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view all jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- JOB UPDATE REQUESTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins and support can view update requests" ON public.job_update_requests;
DROP POLICY IF EXISTS "Admins, CEOs, and support can view update requests" ON public.job_update_requests;
DROP POLICY IF EXISTS "Admins and support can update requests" ON public.job_update_requests;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update requests" ON public.job_update_requests;

CREATE POLICY "Authenticated users can view job update requests"
  ON public.job_update_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create job update requests"
  ON public.job_update_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job update requests"
  ON public.job_update_requests FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- MAINTENANCE REQUESTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins and support can view all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins, CEOs, and support can view all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins and support can update requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins and CEOs can delete requests" ON public.maintenance_requests;

CREATE POLICY "Authenticated users can view all maintenance requests"
  ON public.maintenance_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create maintenance requests"
  ON public.maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance requests"
  ON public.maintenance_requests FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete maintenance requests"
  ON public.maintenance_requests FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- BRANCHES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins and CEOs can create branches" ON public.branches;
DROP POLICY IF EXISTS "Admins and CEOs can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins and CEOs can delete branches" ON public.branches;

CREATE POLICY "Authenticated users can view all branches"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create branches"
  ON public.branches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update branches"
  ON public.branches FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete branches"
  ON public.branches FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- HARDWARE INVENTORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can create hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can update hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can delete hardware" ON public.hardware_inventory;

CREATE POLICY "Authenticated users can view all hardware"
  ON public.hardware_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create hardware"
  ON public.hardware_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hardware"
  ON public.hardware_inventory FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete hardware"
  ON public.hardware_inventory FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- SOFTWARE INVENTORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view software" ON public.software_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can create software" ON public.software_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can update software" ON public.software_inventory;
DROP POLICY IF EXISTS "Admins and CEOs can delete software" ON public.software_inventory;

CREATE POLICY "Authenticated users can view all software"
  ON public.software_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create software"
  ON public.software_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update software"
  ON public.software_inventory FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete software"
  ON public.software_inventory FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- LICENSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins and CEOs can create licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins and CEOs can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Admins and CEOs can delete licenses" ON public.licenses;

CREATE POLICY "Authenticated users can view all licenses"
  ON public.licenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create licenses"
  ON public.licenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update licenses"
  ON public.licenses FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete licenses"
  ON public.licenses FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- VPN/RDP CREDENTIALS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins and CEOs can create credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins and CEOs can update credentials" ON public.vpn_rdp_credentials;
DROP POLICY IF EXISTS "Admins and CEOs can delete credentials" ON public.vpn_rdp_credentials;

CREATE POLICY "Authenticated users can view all credentials"
  ON public.vpn_rdp_credentials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create credentials"
  ON public.vpn_rdp_credentials FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update credentials"
  ON public.vpn_rdp_credentials FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete credentials"
  ON public.vpn_rdp_credentials FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- REMOTE SESSIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view sessions" ON public.remote_sessions;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update sessions" ON public.remote_sessions;

CREATE POLICY "Authenticated users can view all remote sessions"
  ON public.remote_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create remote sessions"
  ON public.remote_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update remote sessions"
  ON public.remote_sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete remote sessions"
  ON public.remote_sessions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- PROVIDER EMAILS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view provider emails" ON public.provider_emails;
DROP POLICY IF EXISTS "Admins, CEOs, and support can create provider emails" ON public.provider_emails;
DROP POLICY IF EXISTS "Admins, CEOs, and support can update provider emails" ON public.provider_emails;

CREATE POLICY "Authenticated users can view all provider emails"
  ON public.provider_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create provider emails"
  ON public.provider_emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update provider emails"
  ON public.provider_emails FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete provider emails"
  ON public.provider_emails FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Support staff can create support replies" ON public.chat_messages;
DROP POLICY IF EXISTS "Support staff, admins, and CEOs can create support replies" ON public.chat_messages;

CREATE POLICY "Authenticated users can view all chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chat messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================================
-- NETWORK DEVICES TABLE (if exists)
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view network devices" ON public.network_devices;
DROP POLICY IF EXISTS "Admins and CEOs can manage network devices" ON public.network_devices;

CREATE POLICY "Authenticated users can view all network devices"
  ON public.network_devices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage network devices"
  ON public.network_devices FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- INTERNET CONNECTIVITY TABLE (if exists)
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view connectivity" ON public.internet_connectivity;
DROP POLICY IF EXISTS "Admins and CEOs can manage connectivity" ON public.internet_connectivity;

CREATE POLICY "Authenticated users can view all internet connectivity"
  ON public.internet_connectivity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage internet connectivity"
  ON public.internet_connectivity FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- NETWORK DIAGRAMS TABLE (if exists)
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view diagrams" ON public.network_diagrams;
DROP POLICY IF EXISTS "Admins and CEOs can manage diagrams" ON public.network_diagrams;

CREATE POLICY "Authenticated users can view all network diagrams"
  ON public.network_diagrams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage network diagrams"
  ON public.network_diagrams FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- DIRECTORY USERS TABLE (Microsoft 365)
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view directory users" ON public.directory_users;
DROP POLICY IF EXISTS "Admins and CEOs can manage directory users" ON public.directory_users;

CREATE POLICY "Authenticated users can view all directory users"
  ON public.directory_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage directory users"
  ON public.directory_users FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- REMOTE CLIENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Admins, CEOs, and support can view remote clients" ON public.remote_clients;
DROP POLICY IF EXISTS "Admins and CEOs can manage remote clients" ON public.remote_clients;
DROP POLICY IF EXISTS "Users can view own remote client" ON public.remote_clients;

CREATE POLICY "Authenticated users can view all remote clients"
  ON public.remote_clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage remote clients"
  ON public.remote_clients FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- USER_ROLES TABLE - Keep admin-only access for role management
-- ============================================================================
-- Keep existing policies that restrict this table to admins only
-- This allows admins to still manage roles if needed in the future

COMMENT ON TABLE public.user_roles IS 'Role management table - access restricted to admins only. Note: The UI no longer enforces role-based access controls, so roles are effectively informational only.';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- All authenticated users now have full access to all tables except user_roles
-- This aligns the database security model with the UI changes
-- RLS is still enabled to ensure users must be authenticated
-- Future: Consider re-implementing granular permissions if needed
