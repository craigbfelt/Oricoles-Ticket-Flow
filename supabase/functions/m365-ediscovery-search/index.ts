import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface SearchRequest {
  query: string;
  targetMailboxes?: string[];
}

interface ExportStatusRequest {
  exportId: string;
}

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

/**
 * Get an access token from Azure AD using client credentials flow
 */
async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('AZURE_TENANT_ID');
  const clientId = Deno.env.get('AZURE_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure credentials not configured. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.');
  }

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
 * Get or create the eDiscovery case for this application
 */
async function getOrCreateCase(accessToken: string): Promise<string> {
  const caseName = Deno.env.get('EDISCOVERY_CASE_DISPLAY_NAME') || 'Oricol eDiscovery Case';
  
  // First, try to list existing cases - use URL constructor for safe parameter handling
  const listUrl = new URL('https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases');
  listUrl.searchParams.set('$filter', `displayName eq '${caseName.replace(/'/g, "''")}'`);
  
  const listResponse = await fetch(
    listUrl.toString(),
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!listResponse.ok) {
    throw new Error(`Failed to list eDiscovery cases: ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  
  if (listData.value && listData.value.length > 0) {
    return listData.value[0].id;
  }

  // Create a new case if none exists
  const createResponse = await fetch(
    'https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: caseName,
        description: 'eDiscovery case for Oricol Ticket Flow content searches',
      }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Create case error:', errorText);
    throw new Error(`Failed to create eDiscovery case: ${createResponse.status}`);
  }

  const createData = await createResponse.json();
  return createData.id;
}

/**
 * Add custodians (mailboxes) to the case
 */
async function addCustodians(accessToken: string, caseId: string, emails: string[]): Promise<string[]> {
  const dataSourceIds: string[] = [];
  
  // Validate caseId format (should be alphanumeric with hyphens)
  if (!/^[a-zA-Z0-9-]+$/.test(caseId)) {
    throw new Error('Invalid case ID format');
  }

  for (const email of emails) {
    // Validate email format before using in API
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn(`Skipping invalid email: ${email}`);
      continue;
    }
    
    // Check if custodian already exists - use URL constructor for safe parameter handling
    const checkUrl = new URL(`https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${encodeURIComponent(caseId)}/custodians`);
    checkUrl.searchParams.set('$filter', `email eq '${email.replace(/'/g, "''")}'`);
    
    const checkResponse = await fetch(
      checkUrl.toString(),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.value && checkData.value.length > 0) {
        // Get the data source ID for existing custodian
        const custodianId = checkData.value[0].id;
        const dsResponse = await fetch(
          `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/custodians/${custodianId}/userSources`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (dsResponse.ok) {
          const dsData = await dsResponse.json();
          if (dsData.value && dsData.value.length > 0) {
            dataSourceIds.push(dsData.value[0].id);
          }
        }
        continue;
      }
    }

    // Add new custodian
    const addResponse = await fetch(
      `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/custodians`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      }
    );

    if (addResponse.ok) {
      const addData = await addResponse.json();
      // Get user sources for the new custodian
      const dsResponse = await fetch(
        `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/custodians/${addData.id}/userSources`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (dsResponse.ok) {
        const dsData = await dsResponse.json();
        if (dsData.value && dsData.value.length > 0) {
          dataSourceIds.push(dsData.value[0].id);
        }
      }
    } else {
      console.error(`Failed to add custodian ${email}: ${addResponse.status}`);
    }
  }

  return dataSourceIds;
}

/**
 * Create an eDiscovery search
 */
async function createSearch(
  accessToken: string, 
  caseId: string, 
  query: string,
  dataSourceIds?: string[]
): Promise<{ searchId: string }> {
  const searchBody: {
    displayName: string;
    description: string;
    contentQuery: string;
    dataSourceScopes?: string;
    additionalSources?: Array<{ '@odata.type': string; id: string }>;
  } = {
    displayName: `Search-${Date.now()}`,
    description: 'Content search from Oricol Ticket Flow',
    contentQuery: query,
  };

  // If specific data sources are provided, use them
  if (dataSourceIds && dataSourceIds.length > 0) {
    searchBody.additionalSources = dataSourceIds.map(id => ({
      '@odata.type': '#microsoft.graph.security.userSource',
      id: id,
    }));
  } else {
    // Search all mailboxes
    searchBody.dataSourceScopes = 'allTenantMailboxes';
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/searches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create search error:', errorText);
    throw new Error(`Failed to create eDiscovery search: ${response.status}`);
  }

  const data = await response.json();
  return { searchId: data.id };
}

/**
 * Start the search estimate (runs the search)
 */
async function runSearchEstimate(accessToken: string, caseId: string, searchId: string): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/searches/${searchId}/estimateStatistics`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status !== 202) {
    const errorText = await response.text();
    console.error('Run estimate error:', errorText);
    throw new Error(`Failed to run search estimate: ${response.status}`);
  }
}

/**
 * Get search status and results
 */
async function getSearchStatus(accessToken: string, caseId: string, searchId: string): Promise<{
  status: string;
  itemCount?: number;
  sizeInBytes?: number;
}> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/searches/${searchId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get search status: ${response.status}`);
  }

  const data = await response.json();
  
  // Get search statistics if available
  let itemCount: number | undefined;
  let sizeInBytes: number | undefined;

  if (data.lastEstimateStatisticsOperation) {
    const statsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/searches/${searchId}/lastEstimateStatisticsOperation`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      itemCount = statsData.indexedItemCount;
      sizeInBytes = statsData.indexedItemsSize;
    }
  }

  return {
    status: data.lastEstimateStatisticsOperation?.status || 'unknown',
    itemCount,
    sizeInBytes,
  };
}

/**
 * Fallback: Use Graph API search for basic mailbox search
 */
async function graphSearch(accessToken: string, query: string): Promise<{
  results: Array<{ subject: string; from: string; receivedDateTime: string }>;
}> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/search/query',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            entityTypes: ['message'],
            query: {
              queryString: query,
            },
            from: 0,
            size: 25,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Graph search failed: ${response.status}`);
  }

  const data = await response.json();
  const hits = data.value?.[0]?.hitsContainers?.[0]?.hits || [];
  
  return {
    results: hits.map((hit: { resource?: { subject?: string; from?: { emailAddress?: { address?: string } }; receivedDateTime?: string } }) => ({
      subject: hit.resource?.subject || 'No subject',
      from: hit.resource?.from?.emailAddress?.address || 'Unknown',
      receivedDateTime: hit.resource?.receivedDateTime || '',
    })),
  };
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
          error: getSupabaseCredentialsErrorMessage(supabaseCredCheck.missing, 'm365-ediscovery-search'),
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
        JSON.stringify({ success: false, error: 'Access denied. Only admins can perform eDiscovery searches.' }),
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

    // Handle GET request - check search status
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const caseId = url.searchParams.get('caseId');
      const searchId = url.searchParams.get('searchId');

      if (!caseId || !searchId) {
        return new Response(
          JSON.stringify({ success: false, error: 'caseId and searchId are required for status checks' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const status = await getSearchStatus(accessToken, caseId, searchId);
        return new Response(
          JSON.stringify({ success: true, ...status }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get search status';
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle POST request - create new search
    if (req.method === 'POST') {
      const { query, targetMailboxes }: SearchRequest = await req.json();

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Search query is required' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize query - limit length and validate KQL syntax patterns
      const sanitizedQuery = query.trim().substring(0, 2000);
      
      // Basic KQL validation - only allow alphanumeric, spaces, and common KQL operators
      // This prevents injection of malicious content while allowing valid KQL syntax
      const kqlPattern = /^[a-zA-Z0-9\s:@.<>=\-_"'()*+,;/\\@#$%^&[\]{}|~!?]+$/;
      if (!kqlPattern.test(sanitizedQuery)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Query contains invalid characters' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try eDiscovery first, fall back to Graph search
      try {
        const caseId = await getOrCreateCase(accessToken);
        
        let dataSourceIds: string[] | undefined;
        if (targetMailboxes && targetMailboxes.length > 0) {
          dataSourceIds = await addCustodians(accessToken, caseId, targetMailboxes);
        }

        const { searchId } = await createSearch(accessToken, caseId, sanitizedQuery, dataSourceIds);
        
        // Start the search estimate
        await runSearchEstimate(accessToken, caseId, searchId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'eDiscovery search started',
            caseId,
            searchId,
            pollUrl: `?caseId=${caseId}&searchId=${searchId}`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (ediscoveryError) {
        console.error('eDiscovery error, falling back to Graph search:', ediscoveryError);
        
        // Fall back to Graph search API
        try {
          const results = await graphSearch(accessToken, sanitizedQuery);
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Search completed using Graph API (eDiscovery unavailable)',
              ...results,
              usedFallback: true,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (graphError) {
          const errorMessage = graphError instanceof Error ? graphError.message : 'Search failed';
          return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
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
