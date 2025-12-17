import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

// Note: In production, restrict CORS to your specific domain(s)
// Example: 'Access-Control-Allow-Origin': 'https://your-domain.com'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict to specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-endpoint-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Endpoint Data Ingestion Function
 * 
 * This edge function receives data from endpoint monitoring agents installed on client machines.
 * It authenticates the agent, validates the data, and stores it in the database.
 * 
 * Security: Uses token-based authentication for endpoint agents
 */

interface EndpointData {
  // Agent identification
  agentToken: string;
  agentVersion: string;
  
  // Device information
  deviceName: string;
  hostname: string;
  userId?: string; // Optional, can be looked up from device
  
  // Operating System
  osName: string;
  osVersion: string;
  osBuild: string;
  osArchitecture: string;
  
  // Hardware
  cpuModel: string;
  cpuCores: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  
  // Network
  ipAddress: string;
  macAddress: string;
  domainJoined: boolean;
  domainName?: string;
  
  // Metrics
  metrics: {
    // Antivirus
    antivirusName?: string;
    antivirusVersion?: string;
    antivirusDefinitionsVersion?: string;
    antivirusDefinitionsUpdatedAt?: string;
    antivirusEnabled: boolean;
    antivirusRealTimeProtection: boolean;
    
    // Windows Update
    windowsUpdateStatus: string;
    windowsUpdateLastCheck?: string;
    windowsUpdateLastInstall?: string;
    pendingUpdatesCount: number;
    pendingUpdatesCritical: number;
    pendingUpdatesSecurity: number;
    
    // Ransomware Protection
    ransomwareProtectionEnabled: boolean;
    controlledFolderAccessEnabled: boolean;
    encryptionStatus: string;
    bitlockerEnabled: boolean;
    
    // Firewall
    firewallEnabled: boolean;
    firewallProfile: string;
    
    // Storage
    storageUsedGB: number;
    storageFreeGB: number;
    storageUsagePercent: number;
    
    // Memory
    memoryUsedGB: number;
    memoryUsagePercent: number;
    
    // CPU
    cpuUsagePercent: number;
    
    // Network
    networkUploadMbps: number;
    networkDownloadMbps: number;
    
    // Compliance
    overallComplianceStatus: string;
    securityLevel: string;
  };
  
  // Network processes (optional)
  networkProcesses?: Array<{
    processName: string;
    processId: number;
    processPath: string;
    bytesSent: number;
    bytesReceived: number;
    connectionsCount: number;
    uploadRateMbps: number;
    downloadRateMbps: number;
    isSuspicious: boolean;
    isBlocked: boolean;
  }>;
  
  // Security scan results (optional)
  securityScans?: Array<{
    scanType: string;
    scanStatus: string;
    issuesFound: number;
    issuesCritical: number;
    issuesHigh: number;
    issuesMedium: number;
    issuesLow: number;
    findings: any;
    autoFixApplied: boolean;
    autoFixDetails?: string;
    scanStartedAt: string;
    scanCompletedAt: string;
  }>;
  
  // Policy compliance (optional)
  policies?: Array<{
    policyName: string;
    policyCategory: string;
    policyDescription?: string;
    currentValue: string;
    expectedValue: string;
    isCompliant: boolean;
    complianceStatus: string;
    severity?: string;
    canAutoFix: boolean;
    autoFixApplied: boolean;
  }>;
  
  // Security events (optional)
  securityEvents?: Array<{
    eventType: string;
    eventSeverity: string;
    eventTitle: string;
    eventDescription?: string;
    eventData?: any;
    actionTaken?: string;
    autoRemediated: boolean;
    processBlocked: boolean;
    processName?: string;
    processPath?: string;
    eventTime: string;
  }>;
}

/**
 * Hash a token using SHA-256
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify endpoint agent token
 */
async function verifyAgentToken(supabase: any, plainToken: string): Promise<{ valid: boolean; endpointId?: string }> {
  // Hash the incoming token to compare with stored hash
  const tokenHash = await hashToken(plainToken);
  
  const { data, error } = await supabase
    .from('endpoint_agent_tokens')
    .select('endpoint_id, expires_at, is_active')
    .eq('token_hash', tokenHash)
    .single();
  
  if (error || !data) {
    return { valid: false };
  }
  
  // Check if token is active
  if (!data.is_active) {
    return { valid: false };
  }
  
  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false };
  }
  
  // Update last used timestamp
  await supabase
    .from('endpoint_agent_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);
  
  return { valid: true, endpointId: data.endpoint_id };
}

/**
 * Upsert endpoint monitoring record
 */
async function upsertEndpoint(supabase: any, endpointId: string | undefined, data: EndpointData) {
  const endpointData = {
    device_name: data.deviceName,
    hostname: data.hostname,
    user_id: data.userId,
    status: 'online',
    last_seen_at: new Date().toISOString(),
    agent_version: data.agentVersion,
    os_name: data.osName,
    os_version: data.osVersion,
    os_build: data.osBuild,
    os_architecture: data.osArchitecture,
    cpu_model: data.cpuModel,
    cpu_cores: data.cpuCores,
    total_memory_gb: data.totalMemoryGB,
    total_storage_gb: data.totalStorageGB,
    ip_address: data.ipAddress,
    mac_address: data.macAddress,
    domain_joined: data.domainJoined,
    domain_name: data.domainName,
  };
  
  if (endpointId) {
    // Update existing endpoint
    const { data: updated, error } = await supabase
      .from('endpoint_monitoring')
      .update(endpointData)
      .eq('id', endpointId)
      .select()
      .single();
    
    if (error) throw error;
    return updated.id;
  } else {
    // Insert new endpoint
    const { data: inserted, error } = await supabase
      .from('endpoint_monitoring')
      .insert(endpointData)
      .select()
      .single();
    
    if (error) throw error;
    return inserted.id;
  }
}

/**
 * Insert endpoint metrics
 */
async function insertMetrics(supabase: any, endpointId: string, metrics: EndpointData['metrics']) {
  const metricsData = {
    endpoint_id: endpointId,
    antivirus_name: metrics.antivirusName,
    antivirus_version: metrics.antivirusVersion,
    antivirus_definitions_version: metrics.antivirusDefinitionsVersion,
    antivirus_definitions_updated_at: metrics.antivirusDefinitionsUpdatedAt,
    antivirus_enabled: metrics.antivirusEnabled,
    antivirus_real_time_protection: metrics.antivirusRealTimeProtection,
    windows_update_status: metrics.windowsUpdateStatus,
    windows_update_last_check: metrics.windowsUpdateLastCheck,
    windows_update_last_install: metrics.windowsUpdateLastInstall,
    pending_updates_count: metrics.pendingUpdatesCount,
    pending_updates_critical: metrics.pendingUpdatesCritical,
    pending_updates_security: metrics.pendingUpdatesSecurity,
    ransomware_protection_enabled: metrics.ransomwareProtectionEnabled,
    controlled_folder_access_enabled: metrics.controlledFolderAccessEnabled,
    encryption_status: metrics.encryptionStatus,
    bitlocker_enabled: metrics.bitlockerEnabled,
    firewall_enabled: metrics.firewallEnabled,
    firewall_profile: metrics.firewallProfile,
    storage_used_gb: metrics.storageUsedGB,
    storage_free_gb: metrics.storageFreeGB,
    storage_usage_percent: metrics.storageUsagePercent,
    memory_used_gb: metrics.memoryUsedGB,
    memory_usage_percent: metrics.memoryUsagePercent,
    cpu_usage_percent: metrics.cpuUsagePercent,
    network_upload_mbps: metrics.networkUploadMbps,
    network_download_mbps: metrics.networkDownloadMbps,
    overall_compliance_status: metrics.overallComplianceStatus,
    security_level: metrics.securityLevel,
    collected_at: new Date().toISOString(),
  };
  
  const { error } = await supabase
    .from('endpoint_metrics')
    .insert(metricsData);
  
  if (error) throw error;
}

/**
 * Insert network processes
 */
async function insertNetworkProcesses(supabase: any, endpointId: string, processes: EndpointData['networkProcesses']) {
  if (!processes || processes.length === 0) return;
  
  const processesData = processes.map(p => ({
    endpoint_id: endpointId,
    process_name: p.processName,
    process_id: p.processId,
    process_path: p.processPath,
    bytes_sent: p.bytesSent,
    bytes_received: p.bytesReceived,
    connections_count: p.connectionsCount,
    upload_rate_mbps: p.uploadRateMbps,
    download_rate_mbps: p.downloadRateMbps,
    is_suspicious: p.isSuspicious,
    is_blocked: p.isBlocked,
    collected_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('endpoint_network_processes')
    .insert(processesData);
  
  if (error) throw error;
}

/**
 * Insert security scans
 */
async function insertSecurityScans(supabase: any, endpointId: string, scans: EndpointData['securityScans']) {
  if (!scans || scans.length === 0) return;
  
  const scansData = scans.map(s => ({
    endpoint_id: endpointId,
    scan_type: s.scanType,
    scan_status: s.scanStatus,
    issues_found: s.issuesFound,
    issues_critical: s.issuesCritical,
    issues_high: s.issuesHigh,
    issues_medium: s.issuesMedium,
    issues_low: s.issuesLow,
    findings: s.findings,
    auto_fix_applied: s.autoFixApplied,
    auto_fix_details: s.autoFixDetails,
    scan_started_at: s.scanStartedAt,
    scan_completed_at: s.scanCompletedAt,
  }));
  
  const { error } = await supabase
    .from('endpoint_security_scans')
    .insert(scansData);
  
  if (error) throw error;
}

/**
 * Upsert policies
 */
async function upsertPolicies(supabase: any, endpointId: string, policies: EndpointData['policies']) {
  if (!policies || policies.length === 0) return;
  
  for (const policy of policies) {
    const policyData = {
      endpoint_id: endpointId,
      policy_name: policy.policyName,
      policy_category: policy.policyCategory,
      policy_description: policy.policyDescription,
      current_value: policy.currentValue,
      expected_value: policy.expectedValue,
      is_compliant: policy.isCompliant,
      compliance_status: policy.complianceStatus,
      severity: policy.severity,
      can_auto_fix: policy.canAutoFix,
      auto_fix_applied: policy.autoFixApplied,
      last_checked_at: new Date().toISOString(),
    };
    
    // Try to update existing policy, or insert if not found
    const { data: existing } = await supabase
      .from('endpoint_policies')
      .select('id')
      .eq('endpoint_id', endpointId)
      .eq('policy_name', policy.policyName)
      .single();
    
    if (existing) {
      await supabase
        .from('endpoint_policies')
        .update(policyData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('endpoint_policies')
        .insert(policyData);
    }
  }
}

/**
 * Insert security events
 */
async function insertSecurityEvents(supabase: any, endpointId: string, events: EndpointData['securityEvents']) {
  if (!events || events.length === 0) return;
  
  const eventsData = events.map(e => ({
    endpoint_id: endpointId,
    event_type: e.eventType,
    event_severity: e.eventSeverity,
    event_title: e.eventTitle,
    event_description: e.eventDescription,
    event_data: e.eventData,
    action_taken: e.actionTaken,
    auto_remediated: e.autoRemediated,
    process_blocked: e.processBlocked,
    process_name: e.processName,
    process_path: e.processPath,
    event_time: e.eventTime,
  }));
  
  const { error } = await supabase
    .from('endpoint_security_events')
    .insert(eventsData);
  
  if (error) throw error;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let endpointData: EndpointData;
    try {
      endpointData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!endpointData.agentToken || !endpointData.deviceName || !endpointData.metrics) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentToken, deviceName, or metrics' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate data types
    if (typeof endpointData.agentToken !== 'string' || 
        typeof endpointData.deviceName !== 'string' ||
        typeof endpointData.metrics !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid data types in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify agent token
    const { valid, endpointId } = await verifyAgentToken(supabase, endpointData.agentToken);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired agent token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert endpoint record
    const finalEndpointId = await upsertEndpoint(supabase, endpointId, endpointData);

    // Insert metrics
    await insertMetrics(supabase, finalEndpointId, endpointData.metrics);

    // Insert optional data if provided
    if (endpointData.networkProcesses) {
      await insertNetworkProcesses(supabase, finalEndpointId, endpointData.networkProcesses);
    }

    if (endpointData.securityScans) {
      await insertSecurityScans(supabase, finalEndpointId, endpointData.securityScans);
    }

    if (endpointData.policies) {
      await upsertPolicies(supabase, finalEndpointId, endpointData.policies);
    }

    if (endpointData.securityEvents) {
      await insertSecurityEvents(supabase, finalEndpointId, endpointData.securityEvents);
    }

    return new Response(
      JSON.stringify({
        success: true,
        endpointId: finalEndpointId,
        message: 'Endpoint data received and stored successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing endpoint data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
