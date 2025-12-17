-- Endpoint Monitoring System Schema
-- This migration creates the database structure for comprehensive endpoint monitoring
-- including security, performance, compliance, and real-time metrics

-- Create enum types for endpoint monitoring
CREATE TYPE endpoint_status AS ENUM ('online', 'offline', 'warning', 'critical');
CREATE TYPE compliance_status AS ENUM ('compliant', 'non_compliant', 'not_evaluated', 'warning');
CREATE TYPE security_level AS ENUM ('secure', 'warning', 'critical', 'unknown');
CREATE TYPE scan_type AS ENUM ('antivirus', 'vulnerability', 'policy', 'ransomware', 'encryption');

-- Main endpoint monitoring table
-- Stores overall device information and current status
CREATE TABLE IF NOT EXISTS endpoint_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  hostname TEXT,
  
  -- Status information
  status endpoint_status DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  agent_version TEXT,
  
  -- Operating System
  os_name TEXT,
  os_version TEXT,
  os_build TEXT,
  os_architecture TEXT,
  
  -- Hardware information
  cpu_model TEXT,
  cpu_cores INTEGER,
  total_memory_gb NUMERIC(10, 2),
  total_storage_gb NUMERIC(10, 2),
  
  -- Network information
  ip_address TEXT,
  mac_address TEXT,
  domain_joined BOOLEAN DEFAULT false,
  domain_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT endpoint_monitoring_device_name_check CHECK (char_length(device_name) <= 255)
);

-- Endpoint metrics table
-- Stores real-time performance and security metrics
CREATE TABLE IF NOT EXISTS endpoint_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  -- Antivirus status
  antivirus_name TEXT,
  antivirus_version TEXT,
  antivirus_definitions_version TEXT,
  antivirus_definitions_updated_at TIMESTAMPTZ,
  antivirus_enabled BOOLEAN DEFAULT false,
  antivirus_real_time_protection BOOLEAN DEFAULT false,
  
  -- Windows Update status
  windows_update_status TEXT,
  windows_update_last_check TIMESTAMPTZ,
  windows_update_last_install TIMESTAMPTZ,
  pending_updates_count INTEGER DEFAULT 0,
  pending_updates_critical INTEGER DEFAULT 0,
  pending_updates_security INTEGER DEFAULT 0,
  
  -- Ransomware Protection
  ransomware_protection_enabled BOOLEAN DEFAULT false,
  controlled_folder_access_enabled BOOLEAN DEFAULT false,
  encryption_status TEXT,
  bitlocker_enabled BOOLEAN DEFAULT false,
  
  -- Firewall status
  firewall_enabled BOOLEAN DEFAULT false,
  firewall_profile TEXT,
  
  -- Storage metrics
  storage_used_gb NUMERIC(10, 2),
  storage_free_gb NUMERIC(10, 2),
  storage_usage_percent NUMERIC(5, 2),
  
  -- Memory metrics
  memory_used_gb NUMERIC(10, 2),
  memory_usage_percent NUMERIC(5, 2),
  
  -- CPU metrics
  cpu_usage_percent NUMERIC(5, 2),
  
  -- Network metrics
  network_upload_mbps NUMERIC(10, 2),
  network_download_mbps NUMERIC(10, 2),
  
  -- Compliance
  overall_compliance_status compliance_status DEFAULT 'not_evaluated',
  security_level security_level DEFAULT 'unknown',
  
  -- Timestamps
  collected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT endpoint_metrics_percentages CHECK (
    (storage_usage_percent IS NULL OR (storage_usage_percent >= 0 AND storage_usage_percent <= 100)) AND
    (memory_usage_percent IS NULL OR (memory_usage_percent >= 0 AND memory_usage_percent <= 100)) AND
    (cpu_usage_percent IS NULL OR (cpu_usage_percent >= 0 AND cpu_usage_percent <= 100))
  )
);

-- Network process monitoring
-- Tracks bandwidth usage per application/process
CREATE TABLE IF NOT EXISTS endpoint_network_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  process_name TEXT NOT NULL,
  process_id INTEGER,
  process_path TEXT,
  
  -- Network usage
  bytes_sent BIGINT DEFAULT 0,
  bytes_received BIGINT DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  
  -- Bandwidth rates (calculated over monitoring period)
  upload_rate_mbps NUMERIC(10, 2),
  download_rate_mbps NUMERIC(10, 2),
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  
  collected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security scans table
-- Stores results of security vulnerability scans
CREATE TABLE IF NOT EXISTS endpoint_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  scan_type scan_type NOT NULL,
  scan_status TEXT DEFAULT 'completed',
  
  -- Scan results
  issues_found INTEGER DEFAULT 0,
  issues_critical INTEGER DEFAULT 0,
  issues_high INTEGER DEFAULT 0,
  issues_medium INTEGER DEFAULT 0,
  issues_low INTEGER DEFAULT 0,
  
  -- Detailed findings (stored as JSONB for flexibility)
  findings JSONB,
  
  -- Auto-remediation
  auto_fix_applied BOOLEAN DEFAULT false,
  auto_fix_details TEXT,
  
  -- Timestamps
  scan_started_at TIMESTAMPTZ,
  scan_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group Policy compliance table
-- Tracks Group Policy settings and compliance
CREATE TABLE IF NOT EXISTS endpoint_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  policy_name TEXT NOT NULL,
  policy_category TEXT,
  policy_description TEXT,
  
  -- Current vs Expected
  current_value TEXT,
  expected_value TEXT,
  
  -- Compliance status
  is_compliant BOOLEAN DEFAULT false,
  compliance_status compliance_status DEFAULT 'not_evaluated',
  
  -- Severity if non-compliant
  severity TEXT,
  
  -- Auto-fix capability
  can_auto_fix BOOLEAN DEFAULT false,
  auto_fix_applied BOOLEAN DEFAULT false,
  
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Endpoint security events
-- Logs security-related events and alerts
CREATE TABLE IF NOT EXISTS endpoint_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  event_type TEXT NOT NULL,
  event_severity TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  
  -- Event details
  event_data JSONB,
  
  -- Actions taken
  action_taken TEXT,
  auto_remediated BOOLEAN DEFAULT false,
  
  -- Zero Trust flags
  process_blocked BOOLEAN DEFAULT false,
  process_name TEXT,
  process_path TEXT,
  
  event_time TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent authentication tokens
-- Stores authentication tokens for endpoint agents
CREATE TABLE IF NOT EXISTS endpoint_agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES endpoint_monitoring(id) ON DELETE CASCADE NOT NULL,
  
  token_hash TEXT NOT NULL UNIQUE,
  token_name TEXT,
  
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_endpoint_monitoring_device_id ON endpoint_monitoring(device_id);
CREATE INDEX idx_endpoint_monitoring_user_id ON endpoint_monitoring(user_id);
CREATE INDEX idx_endpoint_monitoring_status ON endpoint_monitoring(status);
CREATE INDEX idx_endpoint_monitoring_last_seen ON endpoint_monitoring(last_seen_at);

CREATE INDEX idx_endpoint_metrics_endpoint_id ON endpoint_metrics(endpoint_id);
CREATE INDEX idx_endpoint_metrics_collected_at ON endpoint_metrics(collected_at DESC);
CREATE INDEX idx_endpoint_metrics_compliance ON endpoint_metrics(overall_compliance_status);
CREATE INDEX idx_endpoint_metrics_security ON endpoint_metrics(security_level);

CREATE INDEX idx_endpoint_network_processes_endpoint_id ON endpoint_network_processes(endpoint_id);
CREATE INDEX idx_endpoint_network_processes_collected_at ON endpoint_network_processes(collected_at DESC);
CREATE INDEX idx_endpoint_network_processes_suspicious ON endpoint_network_processes(is_suspicious) WHERE is_suspicious = true;

CREATE INDEX idx_endpoint_security_scans_endpoint_id ON endpoint_security_scans(endpoint_id);
CREATE INDEX idx_endpoint_security_scans_type ON endpoint_security_scans(scan_type);
CREATE INDEX idx_endpoint_security_scans_completed ON endpoint_security_scans(scan_completed_at DESC);

CREATE INDEX idx_endpoint_policies_endpoint_id ON endpoint_policies(endpoint_id);
CREATE INDEX idx_endpoint_policies_compliant ON endpoint_policies(is_compliant);
CREATE INDEX idx_endpoint_policies_status ON endpoint_policies(compliance_status);

CREATE INDEX idx_endpoint_security_events_endpoint_id ON endpoint_security_events(endpoint_id);
CREATE INDEX idx_endpoint_security_events_time ON endpoint_security_events(event_time DESC);
CREATE INDEX idx_endpoint_security_events_severity ON endpoint_security_events(event_severity);

CREATE INDEX idx_endpoint_agent_tokens_endpoint_id ON endpoint_agent_tokens(endpoint_id);
CREATE INDEX idx_endpoint_agent_tokens_hash ON endpoint_agent_tokens(token_hash);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_endpoint_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_endpoint_monitoring_updated_at
  BEFORE UPDATE ON endpoint_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION update_endpoint_monitoring_updated_at();

CREATE TRIGGER update_endpoint_policies_updated_at
  BEFORE UPDATE ON endpoint_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_endpoint_monitoring_updated_at();

CREATE TRIGGER update_endpoint_agent_tokens_updated_at
  BEFORE UPDATE ON endpoint_agent_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_endpoint_monitoring_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE endpoint_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_network_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_agent_tokens ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin or support staff
CREATE OR REPLACE FUNCTION is_admin_or_support()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'support_staff', 'ceo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for endpoint_monitoring
-- Admins and support staff can see all endpoints
CREATE POLICY "Admin and support can view all endpoints"
  ON endpoint_monitoring FOR SELECT
  USING (is_admin_or_support());

-- Users can only see their own endpoints
CREATE POLICY "Users can view their own endpoints"
  ON endpoint_monitoring FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert/update (from edge functions)
CREATE POLICY "Service role can manage endpoints"
  ON endpoint_monitoring FOR ALL
  USING (auth.role() = 'service_role');

-- Similar policies for other tables
CREATE POLICY "Admin and support can view all metrics"
  ON endpoint_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endpoint_monitoring em
      WHERE em.id = endpoint_metrics.endpoint_id
      AND (is_admin_or_support() OR em.user_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage metrics"
  ON endpoint_metrics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admin and support can view network processes"
  ON endpoint_network_processes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endpoint_monitoring em
      WHERE em.id = endpoint_network_processes.endpoint_id
      AND (is_admin_or_support() OR em.user_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage network processes"
  ON endpoint_network_processes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admin and support can view security scans"
  ON endpoint_security_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endpoint_monitoring em
      WHERE em.id = endpoint_security_scans.endpoint_id
      AND (is_admin_or_support() OR em.user_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage security scans"
  ON endpoint_security_scans FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admin and support can view policies"
  ON endpoint_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endpoint_monitoring em
      WHERE em.id = endpoint_policies.endpoint_id
      AND (is_admin_or_support() OR em.user_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage policies"
  ON endpoint_policies FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admin and support can view security events"
  ON endpoint_security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM endpoint_monitoring em
      WHERE em.id = endpoint_security_events.endpoint_id
      AND (is_admin_or_support() OR em.user_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage security events"
  ON endpoint_security_events FOR ALL
  USING (auth.role() = 'service_role');

-- Only service role can manage agent tokens
CREATE POLICY "Service role can manage agent tokens"
  ON endpoint_agent_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Create a view for dashboard display
CREATE OR REPLACE VIEW endpoint_dashboard_summary AS
SELECT 
  em.id,
  em.device_name,
  em.hostname,
  em.status,
  em.last_seen_at,
  em.user_id,
  em.os_name,
  em.os_version,
  em.os_build,
  
  -- Latest metrics
  met.antivirus_name,
  met.antivirus_enabled,
  met.windows_update_status,
  met.pending_updates_count,
  met.pending_updates_critical,
  met.ransomware_protection_enabled,
  met.bitlocker_enabled,
  met.storage_usage_percent,
  met.memory_usage_percent,
  met.cpu_usage_percent,
  met.overall_compliance_status,
  met.security_level,
  
  -- Count of recent issues
  (SELECT COUNT(*) FROM endpoint_security_scans ess 
   WHERE ess.endpoint_id = em.id 
   AND ess.scan_completed_at > now() - interval '24 hours'
   AND ess.issues_critical > 0) as critical_issues_24h,
   
  (SELECT COUNT(*) FROM endpoint_security_events ese 
   WHERE ese.endpoint_id = em.id 
   AND ese.event_time > now() - interval '24 hours'
   AND ese.event_severity IN ('critical', 'high')) as security_events_24h,
   
  -- Profile info
  p.full_name as user_name,
  p.email as user_email

FROM endpoint_monitoring em
LEFT JOIN LATERAL (
  SELECT * FROM endpoint_metrics
  WHERE endpoint_id = em.id
  ORDER BY collected_at DESC
  LIMIT 1
) met ON true
LEFT JOIN profiles p ON em.user_id = p.id;

-- Grant permissions on the view
GRANT SELECT ON endpoint_dashboard_summary TO authenticated;

-- Add comment documentation
COMMENT ON TABLE endpoint_monitoring IS 'Main table for tracking endpoint devices and their current status';
COMMENT ON TABLE endpoint_metrics IS 'Real-time metrics collected from endpoint agents including security, performance, and compliance data';
COMMENT ON TABLE endpoint_network_processes IS 'Network bandwidth usage tracked per process on each endpoint';
COMMENT ON TABLE endpoint_security_scans IS 'Results of security scans performed on endpoints';
COMMENT ON TABLE endpoint_policies IS 'Group Policy compliance tracking for each endpoint';
COMMENT ON TABLE endpoint_security_events IS 'Security events and alerts from endpoints';
COMMENT ON TABLE endpoint_agent_tokens IS 'Authentication tokens for endpoint agents to report data';
COMMENT ON VIEW endpoint_dashboard_summary IS 'Aggregated view of endpoint status for dashboard display';
