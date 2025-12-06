import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Result of credential configuration check
 */
interface CredentialCheckResult {
  configured: boolean;
  missing: string[];
}

/**
 * Check if Supabase service role credentials are configured
 * Returns an object with the status and any missing credentials
 */
function checkSupabaseCredentials(): CredentialCheckResult {
  const missing: string[] = [];
  
  if (!Deno.env.get('SUPABASE_URL')) missing.push('SUPABASE_URL');
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Generate a user-friendly error message for missing Supabase credentials
 */
function getSupabaseCredentialsErrorMessage(missing: string[], functionName?: string): string {
  const baseMessage = `Supabase integration is not configured. Missing environment variables: ${missing.join(', ')}.`;
  
  const instructionParts: string[] = [];
  if (missing.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    instructionParts.push('The SUPABASE_SERVICE_ROLE_KEY is required for this function to work. You can find it in your Supabase Dashboard → Settings → API → Service Role Key.');
  }
  if (missing.includes('SUPABASE_URL')) {
    instructionParts.push('The SUPABASE_URL should be your Supabase project URL (e.g., https://your-project.supabase.co). You can find it in your Supabase Dashboard → Settings → API.');
  }
  
  const instructions = instructionParts.join(' ');
  const addToSecretsMsg = functionName 
    ? `Add the missing variable(s) to your Edge Function secrets (Dashboard → Edge Functions → ${functionName} → Settings → Secrets).`
    : `Add the missing variable(s) to your Edge Function secrets in the Supabase Dashboard.`;
  
  return `${baseMessage} ${instructions} ${addToSecretsMsg}`;
}

/**
 * Creates a Supabase client with the SERVICE ROLE key
 * 
 * ⚠️ WARNING: This client BYPASSES all Row Level Security (RLS) policies!
 * 
 * Security considerations:
 * - NEVER expose this client to client-side code
 * - NEVER share the service role key publicly
 * - Only use in trusted server environments (Edge Functions)
 * - Always validate and sanitize user input before using this client
 */
function createServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface MicrosoftDevice {
  id: string;
  deviceName: string;
  operatingSystem?: string;
  osVersion?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  totalStorageSpaceInBytes?: number;
  freeStorageSpaceInBytes?: number;
  physicalMemoryInBytes?: number;
  managedDeviceOwnerType?: string;
  enrolledDateTime?: string;
  lastSyncDateTime?: string;
  complianceState?: string;
  userPrincipalName?: string;
}

interface MicrosoftUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  mobilePhone?: string;
  accountEnabled?: boolean;
}

interface MicrosoftLicense {
  skuId: string;
  skuPartNumber: string;
  servicePlans?: Array<{ servicePlanName: string }>;
}

interface SyncRequest {
  action: 'sync_devices' | 'sync_users' | 'sync_licenses' | 'full_sync' | 'test_connection' | 'diagnose_connection' | 'get_secure_score' | 'get_compliance_policies' | 'get_conditional_access_policies' | 'get_entra_groups';
  options?: {
    branch?: string;
  };
}

interface DiagnosticStep {
  step: string;
  status: 'success' | 'error' | 'warning' | 'skipped';
  message: string;
  details?: string;
}

interface DiagnosticResult {
  success: boolean;
  steps: DiagnosticStep[];
  summary: string;
}

/**
 * Check if Microsoft 365 credentials are configured
 * Returns an object with the status and any missing credentials
 */
function checkMicrosoftCredentials(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!Deno.env.get('MICROSOFT_TENANT_ID')) missing.push('MICROSOFT_TENANT_ID');
  if (!Deno.env.get('MICROSOFT_CLIENT_ID')) missing.push('MICROSOFT_CLIENT_ID');
  if (!Deno.env.get('MICROSOFT_CLIENT_SECRET')) missing.push('MICROSOFT_CLIENT_SECRET');
  
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Get an access token from Azure AD using client credentials flow
 * Note: Assumes credentials have already been validated by checkMicrosoftCredentials()
 * Returns detailed error information for troubleshooting
 */
async function getAccessTokenWithDetails(): Promise<{ success: boolean; token?: string; error?: string; errorCode?: string; details?: string }> {
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID')!;
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Token error:', responseText);
      
      // Try to parse the error response for more details
      try {
        const errorData = JSON.parse(responseText);
        const errorCode = errorData.error || 'unknown_error';
        const errorDescription = errorData.error_description || 'No description available';
        
        // Provide user-friendly error messages based on common error codes
        let userMessage = '';
        if (errorCode === 'invalid_client') {
          userMessage = 'Invalid client credentials. The client ID or client secret is incorrect.';
        } else if (errorCode === 'unauthorized_client') {
          userMessage = 'The application is not authorized. Check API permissions and admin consent.';
        } else if (errorCode === 'invalid_tenant') {
          userMessage = 'Invalid tenant ID. Verify the MICROSOFT_TENANT_ID value.';
        } else if (errorCode === 'invalid_request') {
          userMessage = 'Invalid request. Check that all credential values are correctly formatted.';
        } else {
          userMessage = `Authentication failed: ${errorDescription}`;
        }
        
        return {
          success: false,
          error: userMessage,
          errorCode: errorCode,
          details: errorDescription,
        };
      } catch {
        return {
          success: false,
          error: `Failed to authenticate with Microsoft: HTTP ${response.status}`,
          details: responseText,
        };
      }
    }

    const data = JSON.parse(responseText);
    return {
      success: true,
      token: data.access_token,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error during authentication';
    return {
      success: false,
      error: errorMessage,
      details: 'Failed to connect to Microsoft login endpoint. Check network connectivity.',
    };
  }
}

/**
 * Get an access token from Azure AD using client credentials flow
 * Note: Assumes credentials have already been validated by checkMicrosoftCredentials()
 */
async function getAccessToken(): Promise<string> {
  const result = await getAccessTokenWithDetails();
  if (!result.success || !result.token) {
    throw new Error(result.error || 'Failed to authenticate with Microsoft');
  }
  return result.token;
}

/**
 * Run comprehensive diagnostics on Microsoft 365 connection
 */
async function runConnectionDiagnostics(): Promise<DiagnosticResult> {
  const steps: DiagnosticStep[] = [];
  let overallSuccess = true;
  
  // Step 1: Check environment variables
  const credCheck = checkMicrosoftCredentials();
  if (credCheck.configured) {
    steps.push({
      step: 'Environment Variables',
      status: 'success',
      message: 'All required credentials are configured',
      details: 'MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET are all present',
    });
  } else {
    steps.push({
      step: 'Environment Variables',
      status: 'error',
      message: `Missing credentials: ${credCheck.missing.join(', ')}`,
      details: 'Configure these in Supabase Dashboard → Edge Functions → sync-microsoft-365 → Settings → Secrets',
    });
    overallSuccess = false;
    return {
      success: false,
      steps,
      summary: 'Cannot proceed without credentials. Please configure the missing environment variables.',
    };
  }
  
  // Step 2: Validate credential format
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID')!;
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!;
  
  // Check if tenant ID looks like a valid GUID or domain
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const domainPattern = /^[a-z0-9-]+\.onmicrosoft\.com$/i;
  
  if (guidPattern.test(tenantId) || domainPattern.test(tenantId)) {
    steps.push({
      step: 'Tenant ID Format',
      status: 'success',
      message: 'Tenant ID format is valid',
      details: `Tenant ID: ${tenantId.substring(0, 8)}...`,
    });
  } else {
    steps.push({
      step: 'Tenant ID Format',
      status: 'warning',
      message: 'Tenant ID format may be incorrect',
      details: 'Expected a GUID (e.g., 12345678-1234-1234-1234-123456789012) or domain (e.g., contoso.onmicrosoft.com)',
    });
  }
  
  // Check if client ID looks like a valid GUID
  if (guidPattern.test(clientId)) {
    steps.push({
      step: 'Client ID Format',
      status: 'success',
      message: 'Client ID format is valid',
      details: `Client ID: ${clientId.substring(0, 8)}...`,
    });
  } else {
    steps.push({
      step: 'Client ID Format',
      status: 'warning',
      message: 'Client ID format may be incorrect',
      details: 'Expected a GUID format (e.g., 12345678-1234-1234-1234-123456789012)',
    });
  }
  
  // Check client secret is not empty and reasonable length
  if (clientSecret.length >= 10) {
    steps.push({
      step: 'Client Secret Format',
      status: 'success',
      message: 'Client secret appears to be set',
      details: `Secret length: ${clientSecret.length} characters`,
    });
  } else {
    steps.push({
      step: 'Client Secret Format',
      status: 'warning',
      message: 'Client secret seems too short',
      details: 'Azure AD client secrets are typically longer. Verify you copied the entire secret value.',
    });
  }
  
  // Step 3: Test token acquisition
  const tokenResult = await getAccessTokenWithDetails();
  if (tokenResult.success) {
    steps.push({
      step: 'Token Acquisition',
      status: 'success',
      message: 'Successfully obtained access token from Microsoft',
      details: 'OAuth2 client credentials flow completed successfully',
    });
  } else {
    steps.push({
      step: 'Token Acquisition',
      status: 'error',
      message: tokenResult.error || 'Failed to obtain access token',
      details: tokenResult.details || 'Check the error code and message for troubleshooting',
    });
    overallSuccess = false;
    return {
      success: false,
      steps,
      summary: `Authentication failed: ${tokenResult.error}. This is typically caused by incorrect credentials or missing admin consent.`,
    };
  }
  
  const accessToken = tokenResult.token!;
  
  // Step 4: Test Organization API (basic permission test)
  try {
    const orgResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      const org = orgData.value?.[0];
      steps.push({
        step: 'Organization Access',
        status: 'success',
        message: `Connected to: ${org?.displayName || 'Unknown Organization'}`,
        details: org?.id ? `Organization ID: ${org.id}` : 'Organization data retrieved successfully',
      });
    } else {
      const errorText = await orgResponse.text();
      steps.push({
        step: 'Organization Access',
        status: 'error',
        message: `Failed to access organization info: HTTP ${orgResponse.status}`,
        details: 'This may indicate missing Organization.Read.All permission',
      });
      overallSuccess = false;
    }
  } catch (err) {
    steps.push({
      step: 'Organization Access',
      status: 'error',
      message: 'Network error accessing organization endpoint',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
    overallSuccess = false;
  }
  
  // Step 5: Test Users API (User.Read.All permission)
  try {
    const usersResponse = await fetch('https://graph.microsoft.com/v1.0/users?$top=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (usersResponse.ok) {
      steps.push({
        step: 'Users API Permission',
        status: 'success',
        message: 'User.Read.All permission is working',
        details: 'Can read user data from Azure AD',
      });
    } else if (usersResponse.status === 403) {
      steps.push({
        step: 'Users API Permission',
        status: 'warning',
        message: 'User.Read.All permission not granted',
        details: 'Add User.Read.All application permission and grant admin consent',
      });
    } else {
      steps.push({
        step: 'Users API Permission',
        status: 'warning',
        message: `Users API returned HTTP ${usersResponse.status}`,
        details: 'May need to grant User.Read.All permission',
      });
    }
  } catch (err) {
    steps.push({
      step: 'Users API Permission',
      status: 'warning',
      message: 'Could not test Users API',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
  
  // Step 6: Test Devices API (DeviceManagementManagedDevices.Read.All permission)
  try {
    const devicesResponse = await fetch('https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (devicesResponse.ok) {
      steps.push({
        step: 'Intune Devices Permission',
        status: 'success',
        message: 'DeviceManagementManagedDevices.Read.All permission is working',
        details: 'Can read device data from Intune',
      });
    } else if (devicesResponse.status === 403) {
      steps.push({
        step: 'Intune Devices Permission',
        status: 'warning',
        message: 'DeviceManagementManagedDevices.Read.All permission not granted',
        details: 'Add this application permission and grant admin consent to enable device sync',
      });
    } else {
      steps.push({
        step: 'Intune Devices Permission',
        status: 'warning',
        message: `Devices API returned HTTP ${devicesResponse.status}`,
        details: 'May need to grant DeviceManagementManagedDevices.Read.All permission',
      });
    }
  } catch (err) {
    steps.push({
      step: 'Intune Devices Permission',
      status: 'warning',
      message: 'Could not test Devices API',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
  
  // Generate summary
  const errorCount = steps.filter(s => s.status === 'error').length;
  const warningCount = steps.filter(s => s.status === 'warning').length;
  const successCount = steps.filter(s => s.status === 'success').length;
  
  let summary = '';
  if (overallSuccess && warningCount === 0) {
    summary = 'All diagnostics passed! Microsoft 365 integration is fully configured.';
  } else if (overallSuccess) {
    summary = `Connection successful with ${warningCount} warning(s). Some features may have limited functionality.`;
  } else {
    summary = `Diagnostics failed with ${errorCount} error(s). Please address the issues above.`;
  }
  
  return {
    success: overallSuccess,
    steps,
    summary,
  };
}

/**
 * Fetch all devices from Microsoft Intune/Endpoint Manager
 */
async function fetchDevices(accessToken: string): Promise<MicrosoftDevice[]> {
  const devices: MicrosoftDevice[] = [];
  
  // Build the initial URL with select parameters for better readability
  const baseUrl = 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices';
  const selectFields = [
    'id',
    'deviceName',
    'operatingSystem',
    'osVersion',
    'manufacturer',
    'model',
    'serialNumber',
    'totalStorageSpaceInBytes',
    'freeStorageSpaceInBytes',
    'physicalMemoryInBytes',
    'managedDeviceOwnerType',
    'enrolledDateTime',
    'lastSyncDateTime',
    'complianceState',
    'userPrincipalName'
  ].join(',');
  
  const initialUrl = new URL(baseUrl);
  initialUrl.searchParams.set('$select', selectFields);
  
  let nextLink: string | null = initialUrl.toString();

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied. Ensure the app has DeviceManagementManagedDevices.Read.All permission.');
      }
      throw new Error(`Failed to fetch devices: ${response.status}`);
    }

    const data = await response.json();
    devices.push(...(data.value || []));
    nextLink = data['@odata.nextLink'] || null;
  }

  return devices;
}

/**
 * Fetch all users from Azure AD
 */
async function fetchUsers(accessToken: string): Promise<MicrosoftUser[]> {
  const users: MicrosoftUser[] = [];
  
  // Build the initial URL with select parameters for better readability
  const baseUrl = 'https://graph.microsoft.com/v1.0/users';
  const selectFields = [
    'id',
    'displayName',
    'mail',
    'userPrincipalName',
    'jobTitle',
    'department',
    'officeLocation',
    'mobilePhone',
    'accountEnabled'
  ].join(',');
  
  const initialUrl = new URL(baseUrl);
  initialUrl.searchParams.set('$select', selectFields);
  
  let nextLink: string | null = initialUrl.toString();

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied. Ensure the app has User.Read.All permission.');
      }
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    users.push(...(data.value || []));
    nextLink = data['@odata.nextLink'] || null;
  }

  return users;
}

/**
 * Fetch all licenses from Microsoft 365
 */
async function fetchLicenses(accessToken: string): Promise<MicrosoftLicense[]> {
  const response = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied. Ensure the app has Organization.Read.All permission.');
    }
    throw new Error(`Failed to fetch licenses: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

// Maximum number of control scores to return (for UI performance)
const MAX_CONTROL_SCORES = 20;

/**
 * Fetch Microsoft Secure Score
 */
async function fetchSecureScore(accessToken: string): Promise<{
  currentScore: number;
  maxScore: number;
  averageComparativeScore: number;
  controlScores: Array<{
    controlName: string;
    score: number;
    description: string;
  }>;
} | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/security/secureScores?$top=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.error('Access denied for Secure Score. Ensure the app has SecurityEvents.Read.All permission.');
        return null;
      }
      return null;
    }

    const data = await response.json();
    const latestScore = data.value?.[0];
    
    if (!latestScore) return null;

    return {
      currentScore: latestScore.currentScore || 0,
      maxScore: latestScore.maxScore || 0,
      averageComparativeScore: latestScore.averageComparativeScores?.find((s: { basis: string }) => s.basis === 'AllTenants')?.averageScore || 0,
      controlScores: (latestScore.controlScores || []).slice(0, MAX_CONTROL_SCORES).map((cs: { controlName: string; score: number; description: string }) => ({
        controlName: cs.controlName,
        score: cs.score,
        description: cs.description || '',
      })),
    };
  } catch (err) {
    console.error('Error fetching Secure Score:', err);
    return null;
  }
}

/**
 * Fetch Intune Compliance Policies
 */
async function fetchCompliancePolicies(accessToken: string): Promise<Array<{
  id: string;
  displayName: string;
  description: string;
  lastModifiedDateTime: string;
  assignments: number;
}>> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies?$expand=assignments', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.error('Access denied for Compliance Policies. Ensure the app has DeviceManagementConfiguration.Read.All permission.');
        return [];
      }
      return [];
    }

    const data = await response.json();
    return (data.value || []).map((policy: { id: string; displayName: string; description: string; lastModifiedDateTime: string; assignments?: unknown[] }) => ({
      id: policy.id,
      displayName: policy.displayName || 'Unnamed Policy',
      description: policy.description || '',
      lastModifiedDateTime: policy.lastModifiedDateTime,
      assignments: policy.assignments?.length || 0,
    }));
  } catch (err) {
    console.error('Error fetching Compliance Policies:', err);
    return [];
  }
}

/**
 * Fetch Conditional Access Policies from Entra ID
 */
async function fetchConditionalAccessPolicies(accessToken: string): Promise<Array<{
  id: string;
  displayName: string;
  state: string;
  createdDateTime: string;
  modifiedDateTime: string;
}>> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.error('Access denied for Conditional Access Policies. Ensure the app has Policy.Read.All permission.');
        return [];
      }
      return [];
    }

    const data = await response.json();
    return (data.value || []).map((policy: { id: string; displayName: string; state: string; createdDateTime: string; modifiedDateTime: string }) => ({
      id: policy.id,
      displayName: policy.displayName || 'Unnamed Policy',
      state: policy.state || 'unknown',
      createdDateTime: policy.createdDateTime,
      modifiedDateTime: policy.modifiedDateTime,
    }));
  } catch (err) {
    console.error('Error fetching Conditional Access Policies:', err);
    return [];
  }
}

/**
 * Fetch Entra ID Groups
 */
async function fetchEntraGroups(accessToken: string): Promise<Array<{
  id: string;
  displayName: string;
  description: string;
  groupTypes: string[];
  membershipRule: string | null;
  memberCount: number;
}>> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,groupTypes,membershipRule&$top=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.error('Access denied for Groups. Ensure the app has Group.Read.All permission.');
        return [];
      }
      return [];
    }

    const data = await response.json();
    return (data.value || []).map((group: { id: string; displayName: string; description: string; groupTypes: string[]; membershipRule: string | null }) => ({
      id: group.id,
      displayName: group.displayName || 'Unnamed Group',
      description: group.description || '',
      groupTypes: group.groupTypes || [],
      membershipRule: group.membershipRule,
      // TODO: Member count requires separate API call per group (GET /groups/{id}/members/$count)
      // Not implemented to avoid N+1 API calls which could hit rate limits
      memberCount: 0,
    }));
  } catch (err) {
    console.error('Error fetching Entra Groups:', err);
    return [];
  }
}

/**
 * Convert bytes to GB, rounded to nearest integer
 */
function bytesToGB(bytes: number | undefined): number | null {
  if (!bytes) return null;
  return Math.round(bytes / (1024 * 1024 * 1024));
}

/**
 * Map Microsoft device type to hardware inventory device type
 */
function mapDeviceType(os: string | undefined): string {
  if (!os) return 'Other';
  const osLower = os.toLowerCase();
  if (osLower.includes('windows')) return 'Desktop';
  if (osLower.includes('macos') || osLower.includes('mac os')) return 'Desktop';
  if (osLower.includes('ios') || osLower.includes('iphone')) return 'Phone';
  if (osLower.includes('android')) return 'Phone';
  if (osLower.includes('ipad')) return 'Tablet';
  return 'Desktop';
}

/**
 * Sync devices from Microsoft Intune to hardware_inventory table
 */
async function syncDevicesToDatabase(
  supabase: ReturnType<typeof createServiceRoleClient>,
  devices: MicrosoftDevice[],
  branch?: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const device of devices) {
    try {
      const deviceData = {
        device_name: device.deviceName,
        device_type: mapDeviceType(device.operatingSystem),
        manufacturer: device.manufacturer || null,
        model: device.model || null,
        serial_number: device.serialNumber || null,
        os: device.operatingSystem || null,
        os_version: device.osVersion || null,
        ram_gb: bytesToGB(device.physicalMemoryInBytes),
        storage_gb: bytesToGB(device.totalStorageSpaceInBytes),
        status: device.complianceState === 'compliant' ? 'active' : 'inactive',
        branch: branch || null,
        m365_device_id: device.id,
        m365_user_principal_name: device.userPrincipalName || null,
        m365_last_sync: device.lastSyncDateTime || null,
        m365_enrolled_date: device.enrolledDateTime || null,
        synced_from_m365: true,
        deleted_manually: false,
      };

      // Upsert based on m365_device_id
      const { error } = await supabase
        .from('hardware_inventory')
        .upsert(deviceData, { 
          onConflict: 'm365_device_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error syncing device ${device.deviceName}:`, error);
        errors++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`Error processing device ${device.deviceName}:`, err);
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Sync users from Azure AD to directory_users table
 */
async function syncUsersToDatabase(
  supabase: ReturnType<typeof createServiceRoleClient>,
  users: MicrosoftUser[]
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Check if user already exists to preserve deleted_manually flag
      const { data: existingUser } = await supabase
        .from('directory_users')
        .select('id, deleted_manually')
        .eq('aad_id', user.id)
        .maybeSingle();

      // Skip users that were manually deleted by admin
      if (existingUser?.deleted_manually) {
        continue;
      }

      const userData = {
        aad_id: user.id,
        display_name: user.displayName || null,
        email: user.mail || null,
        user_principal_name: user.userPrincipalName || null,
        job_title: user.jobTitle || null,
        department: user.department || null,
        account_enabled: user.accountEnabled ?? null,
        updated_at: new Date().toISOString(),
        // Only set deleted_manually to false for new users
        ...(existingUser ? {} : { deleted_manually: false }),
      };

      // Upsert based on aad_id (Azure AD user ID)
      const { error } = await supabase
        .from('directory_users')
        .upsert(userData, { 
          onConflict: 'aad_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error syncing user ${user.displayName}:`, error);
        errors++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`Error processing user ${user.displayName}:`, err);
      errors++;
    }
  }

  return { synced, errors };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Early check for Supabase credentials configuration
    const supabaseCredCheck = checkSupabaseCredentials();
    if (!supabaseCredCheck.configured) {
      console.error('Supabase credentials not configured. Missing:', supabaseCredCheck.missing.join(', '));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: getSupabaseCredentialsErrorMessage(supabaseCredCheck.missing, 'sync-microsoft-365'),
          missingCredentials: supabaseCredCheck.missing,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabase = createServiceRoleClient();
    
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the requesting user is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminError || !adminCheck) {
      console.error('Admin check error:', adminError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Only admins can sync Microsoft 365 data.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body safely
    let requestBody: SyncRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'Request body is required. Please provide an action.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body. Please provide a valid JSON object with an action field.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, options } = requestBody;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required. Valid actions: sync_devices, sync_users, sync_licenses, full_sync, test_connection, diagnose_connection, get_secure_score, get_compliance_policies, get_conditional_access_policies, get_entra_groups' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle diagnose_connection action early (doesn't require token first)
    if (action === 'diagnose_connection') {
      const diagnostics = await runConnectionDiagnostics();
      return new Response(
        JSON.stringify({ 
          success: diagnostics.success,
          diagnostics,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Early check for Microsoft credentials configuration
    const credCheck = checkMicrosoftCredentials();
    if (!credCheck.configured) {
      console.error('Microsoft 365 credentials not configured. Missing:', credCheck.missing.join(', '));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Microsoft 365 integration is not configured. Missing environment variables: ${credCheck.missing.join(', ')}. Please configure these in Supabase Edge Functions settings (Dashboard → Edge Functions → sync-microsoft-365 → Settings → Secrets).`,
          missingCredentials: credCheck.missing,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Microsoft access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate with Microsoft';
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle test connection action
    if (action === 'test_connection') {
      // Try to fetch organization info to verify connection
      const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to connect to Microsoft 365. Check app permissions.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const orgData = await response.json();
      const org = orgData.value?.[0];

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Successfully connected to Microsoft 365',
          organization: {
            displayName: org?.displayName,
            id: org?.id,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_secure_score action
    if (action === 'get_secure_score') {
      const secureScore = await fetchSecureScore(accessToken);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: secureScore,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_compliance_policies action
    if (action === 'get_compliance_policies') {
      const policies = await fetchCompliancePolicies(accessToken);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: policies,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_conditional_access_policies action
    if (action === 'get_conditional_access_policies') {
      const policies = await fetchConditionalAccessPolicies(accessToken);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: policies,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle get_entra_groups action
    if (action === 'get_entra_groups') {
      const groups = await fetchEntraGroups(accessToken);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: groups,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle sync actions
    const results: {
      devices?: { synced: number; errors: number; total: number };
      users?: { synced: number; errors: number; total: number };
      licenses?: { total: number };
    } = {};

    if (action === 'sync_devices' || action === 'full_sync') {
      try {
        const devices = await fetchDevices(accessToken);
        const syncResult = await syncDevicesToDatabase(supabase, devices, options?.branch);
        results.devices = { ...syncResult, total: devices.length };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync devices';
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'sync_users' || action === 'full_sync') {
      try {
        const users = await fetchUsers(accessToken);
        const syncResult = await syncUsersToDatabase(supabase, users);
        results.users = { ...syncResult, total: users.length };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync users';
        console.error('User sync error:', errorMessage);
        // Don't fail the entire sync for user errors in full_sync
        if (action === 'sync_users') {
          return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (action === 'sync_licenses' || action === 'full_sync') {
      try {
        const licenses = await fetchLicenses(accessToken);
        results.licenses = { total: licenses.length };
        // Note: License sync to a separate table can be implemented here if needed
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync licenses';
        console.error('License sync error:', errorMessage);
        // Don't fail the entire sync for license errors in full_sync
        if (action === 'sync_licenses') {
          return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Microsoft 365 sync completed`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
