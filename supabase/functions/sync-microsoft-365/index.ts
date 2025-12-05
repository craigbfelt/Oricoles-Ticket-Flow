import { createServiceRoleClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Check if Supabase credentials are configured
 * Returns an object with the status and any missing credentials
 */
function checkSupabaseCredentials(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!Deno.env.get('SUPABASE_URL')) missing.push('SUPABASE_URL');
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  return {
    configured: missing.length === 0,
    missing,
  };
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
  action: 'sync_devices' | 'sync_users' | 'sync_licenses' | 'full_sync' | 'test_connection';
  options?: {
    branch?: string;
  };
}

/**
 * Check if Microsoft 365 credentials are configured
 * Returns an object with the status and any missing credentials
 */
function checkMicrosoftCredentials(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!Deno.env.get('AZURE_TENANT_ID')) missing.push('AZURE_TENANT_ID');
  if (!Deno.env.get('AZURE_CLIENT_ID')) missing.push('AZURE_CLIENT_ID');
  if (!Deno.env.get('AZURE_CLIENT_SECRET')) missing.push('AZURE_CLIENT_SECRET');
  
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Get an access token from Azure AD using client credentials flow
 * Note: Assumes credentials have already been validated by checkMicrosoftCredentials()
 */
async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('AZURE_TENANT_ID')!;
  const clientId = Deno.env.get('AZURE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET')!;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token error:', errorText);
    throw new Error(`Failed to authenticate with Microsoft: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
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
          error: `Supabase integration is not configured. Missing environment variables: ${supabaseCredCheck.missing.join(', ')}. The SUPABASE_SERVICE_ROLE_KEY is required for this function to work. You can find it in your Supabase Dashboard → Settings → API → Service Role Key. Add it to your Edge Function secrets (Dashboard → Edge Functions → sync-microsoft-365 → Settings → Secrets).`,
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

    // Parse request body
    const { action, options }: SyncRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required. Valid actions: sync_devices, sync_users, sync_licenses, full_sync, test_connection' }),
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

    // Handle sync actions
    const results: {
      devices?: { synced: number; errors: number; total: number };
      users?: { total: number };
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
        results.users = { total: users.length };
        // Note: User sync to a separate table can be implemented here if needed
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
