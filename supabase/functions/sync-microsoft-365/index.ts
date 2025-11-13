import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceRoleClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MicrosoftDevice {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  lastSyncDateTime: string;
  managedDeviceOwnerType?: string;
  userPrincipalName?: string;
}

interface MicrosoftUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string;
  officeLocation?: string;
  jobTitle?: string;
  department?: string;
  accountEnabled?: boolean;
}

interface MicrosoftLicense {
  skuId: string;
  skuPartNumber: string;
  capabilityStatus: string;
  consumedUnits: number;
  prepaidUnits: {
    enabled: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the shared service role client (bypasses RLS for admin operations)
    const supabase = createServiceRoleClient();

    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Microsoft credentials not configured');
    }

    console.log('Starting Microsoft 365 sync...');

    // Get access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token error:', error);
      throw new Error('Failed to authenticate with Microsoft');
    }

    const { access_token } = await tokenResponse.json();
    console.log('Successfully authenticated with Microsoft Graph API');

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    };

    let syncResults = {
      devices: 0,
      users: 0,
      licenses: 0,
      errors: [] as string[],
    };

    // Sync Managed Devices
    try {
      console.log('Fetching managed devices...');
      const devicesResponse = await fetch(
        'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,manufacturer,model,serialNumber,lastSyncDateTime,managedDeviceOwnerType,userPrincipalName',
        { headers }
      );

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        const devices: MicrosoftDevice[] = devicesData.value || [];
        console.log(`Found ${devices.length} devices`);

        for (const device of devices) {
          // Check if this device was manually deleted
          if (device.serialNumber) {
            const { data: existing } = await supabase
              .from('hardware_inventory')
              .select('deleted_manually')
              .eq('serial_number', device.serialNumber)
              .maybeSingle();

            if (existing?.deleted_manually) {
              console.log(`Skipping manually deleted device: ${device.deviceName}`);
              continue;
            }
          }

          const deviceData = {
            device_name: device.deviceName || 'Unknown Device',
            device_type: device.operatingSystem || 'Unknown',
            manufacturer: device.manufacturer || null,
            model: device.model || null,
            serial_number: device.serialNumber || null,
            os: device.operatingSystem || null,
            os_version: device.osVersion || null,
            last_seen: device.lastSyncDateTime || null,
            status: 'active',
            location: device.managedDeviceOwnerType || null,
            notes: `Synced from Microsoft 365 - User: ${device.userPrincipalName || 'N/A'}`,
            deleted_manually: false,
          };

          const { error } = await supabase
            .from('hardware_inventory')
            .upsert(deviceData, { 
              onConflict: 'serial_number',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Error syncing device:', error);
            syncResults.errors.push(`Device ${device.deviceName}: ${error.message}`);
          } else {
            syncResults.devices++;
          }
        }
      } else {
        console.error('Failed to fetch devices:', await devicesResponse.text());
        syncResults.errors.push('Failed to fetch devices from Microsoft Graph');
      }
    } catch (error) {
      console.error('Device sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      syncResults.errors.push(`Device sync: ${errorMessage}`);
    }

    // Sync Users
    try {
      console.log('Fetching users...');
      const usersResponse = await fetch(
        'https://graph.microsoft.com/v1.0/users?$select=id,userPrincipalName,displayName,mail,officeLocation,jobTitle,department,accountEnabled',
        { headers }
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const users: MicrosoftUser[] = usersData.value || [];
        console.log(`Found ${users.length} users`);

        for (const user of users) {
          // Check if this user was manually deleted
          const { data: existing } = await supabase
            .from('directory_users')
            .select('deleted_manually')
            .eq('aad_id', user.id)
            .maybeSingle();

          if (existing?.deleted_manually) {
            console.log(`Skipping manually deleted user: ${user.displayName}`);
            continue;
          }

          const email = user.mail || user.userPrincipalName;
          const { error } = await supabase
            .from('directory_users')
            .upsert({
              aad_id: user.id,
              display_name: user.displayName,
              email,
              user_principal_name: user.userPrincipalName,
              job_title: user.jobTitle || null,
              department: user.department || null,
              account_enabled: typeof user.accountEnabled === 'boolean' ? user.accountEnabled : null,
              deleted_manually: false,
            }, {
              onConflict: 'aad_id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('Error syncing user:', error);
            syncResults.errors.push(`User ${user.displayName}: ${error.message}`);
          } else {
            syncResults.users++;
          }
        }
      } else {
        console.error('Failed to fetch users:', await usersResponse.text());
        syncResults.errors.push('Failed to fetch users from Microsoft Graph');
      }
    } catch (error) {
      console.error('User sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      syncResults.errors.push(`User sync: ${errorMessage}`);
    }

    // Sync Licenses
    try {
      console.log('Fetching licenses...');
      const licensesResponse = await fetch(
        'https://graph.microsoft.com/v1.0/subscribedSkus',
        { headers }
      );

      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json();
        const licenses: MicrosoftLicense[] = licensesData.value || [];
        console.log(`Found ${licenses.length} license types`);

        for (const license of licenses) {
          // Check if this license was manually deleted
          const { data: existing } = await supabase
            .from('licenses')
            .select('deleted_manually')
            .eq('license_name', license.skuPartNumber)
            .eq('vendor', 'Microsoft')
            .maybeSingle();

          if (existing?.deleted_manually) {
            console.log(`Skipping manually deleted license: ${license.skuPartNumber}`);
            continue;
          }

          const licenseData = {
            license_name: license.skuPartNumber,
            vendor: 'Microsoft',
            license_type: 'subscription',
            total_seats: license.prepaidUnits?.enabled || 0,
            used_seats: license.consumedUnits || 0,
            status: license.capabilityStatus === 'Enabled' ? 'active' : 'inactive',
            notes: `Synced from Microsoft 365 - SKU ID: ${license.skuId}`,
            deleted_manually: false,
          };

          const { error } = await supabase
            .from('licenses')
            .upsert(licenseData, { 
              onConflict: 'license_name,vendor',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Error syncing license:', error);
            syncResults.errors.push(`License ${license.skuPartNumber}: ${error.message}`);
          } else {
            syncResults.licenses++;
          }
        }
      } else {
        console.error('Failed to fetch licenses:', await licensesResponse.text());
        syncResults.errors.push('Failed to fetch licenses from Microsoft Graph');
      }
    } catch (error) {
      console.error('License sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      syncResults.errors.push(`License sync: ${errorMessage}`);
    }

    console.log('Sync completed:', syncResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Microsoft 365 sync completed',
        results: syncResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in sync-microsoft-365 function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
