import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Supabase Function (Deno) implementing an eDiscovery flow for Microsoft 365.
 * 
 * This function performs tenant-level mailbox searches using Microsoft Graph eDiscovery APIs.
 * 
 * Required environment variables:
 * - AZURE_TENANT_ID: Your Azure AD tenant ID
 * - AZURE_CLIENT_ID: Azure AD app client ID with eDiscovery permissions
 * - AZURE_CLIENT_SECRET: Azure AD app client secret
 * - EDISCOVERY_CASE_DISPLAY_NAME (optional): Name for the eDiscovery case
 * 
 * Required Azure AD Application Permissions (with admin consent):
 * - eDiscovery.ReadWrite.All
 * - Mail.Read or Mail.ReadBasic.All
 * 
 * Security Warning: This endpoint performs tenant-wide mailbox searches.
 * Implement proper authentication and authorization before production use.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  mailboxes?: string[];
}

interface ExportStatus {
  exportId: string;
  status: string;
  percentComplete?: number;
  downloadUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const tenantId = Deno.env.get('AZURE_TENANT_ID');
    const clientId = Deno.env.get('AZURE_CLIENT_ID');
    const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET');
    const caseDisplayName = Deno.env.get('EDISCOVERY_CASE_DISPLAY_NAME') || 'Oricol eDiscovery Case';

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Azure credentials not configured. Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET environment variables.');
    }

    // Handle GET request - poll export status
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const exportId = url.searchParams.get('exportId');

      if (!exportId) {
        return new Response(
          JSON.stringify({ error: 'exportId parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get access token
      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

      // Poll export status (simplified - in production, you'd query the actual export operation)
      // For now, return a mock status - implement actual Graph API polling
      const status: ExportStatus = {
        exportId,
        status: 'processing',
        percentComplete: 50,
      };

      return new Response(
        JSON.stringify(status),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - create search
    if (req.method === 'POST') {
      const body: SearchRequest = await req.json();
      
      if (!body.query || body.query.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'query is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get access token
      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

      console.log('Starting eDiscovery workflow...');
      console.log('Query:', body.query);
      console.log('Mailboxes:', body.mailboxes || 'All');

      // Execute eDiscovery workflow
      const result = await executeEDiscoveryWorkflow(
        accessToken,
        caseDisplayName,
        body.query,
        body.mailboxes || []
      );

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('eDiscovery search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    // Don't expose stack trace details to client for security
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Obtain Azure AD access token for Microsoft Graph
 */
async function getAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to obtain access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Execute the complete eDiscovery workflow
 * 
 * This is a simplified implementation. A full production implementation would:
 * 1. Find or create an eDiscovery case
 * 2. Add custodians (users) to the case
 * 3. Create a search within the case
 * 4. Execute the search
 * 5. Create a review set and add search results
 * 6. Create an export job
 * 7. Poll export status and return download URL
 * 
 * Note: The full eDiscovery workflow is complex and may take several minutes.
 * This implementation provides a starting point.
 */

interface EDiscoveryCase {
  id: string;
  displayName: string;
  description?: string;
}

interface CasesResponse {
  value?: EDiscoveryCase[];
}

interface SearchResult {
  exportId: string;
  caseId: string | null;
  status: string;
  message: string;
  percentComplete: number;
  note: string;
}

async function executeEDiscoveryWorkflow(
  accessToken: string,
  caseDisplayName: string,
  query: string,
  mailboxes: string[]
): Promise<SearchResult | { results: unknown[]; count: number; message: string }> {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  console.log('Step 1: Finding or creating eDiscovery case...');
  
  // Step 1: Find or create eDiscovery case
  // List existing cases
  const casesResponse = await fetch(
    'https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases',
    { headers }
  );

  if (!casesResponse.ok) {
    const errorText = await casesResponse.text();
    console.error('Failed to list cases:', errorText);
    
    // Fallback: Use Graph search API instead of full eDiscovery
    console.log('Falling back to Graph search API...');
    return await executeGraphSearch(accessToken, query, mailboxes);
  }

  const casesData: CasesResponse = await casesResponse.json();
  let caseId: string | null = null;

  // Find existing case or create new one
  const existingCase = casesData.value?.find((c) => c.displayName === caseDisplayName);
  
  if (existingCase) {
    caseId = existingCase.id;
    console.log(`Using existing case: ${caseId}`);
  } else {
    console.log('Creating new eDiscovery case...');
    const createCaseResponse = await fetch(
      'https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          displayName: caseDisplayName,
          description: 'Automated eDiscovery case for content search',
        }),
      }
    );

    if (!createCaseResponse.ok) {
      const errorText = await createCaseResponse.text();
      console.error('Failed to create case:', errorText);
      // Fallback to Graph search
      return await executeGraphSearch(accessToken, query, mailboxes);
    }

    const newCase = await createCaseResponse.json();
    caseId = newCase.id;
    console.log(`Created case: ${caseId}`);
  }

  // Step 2: Create search (simplified - full implementation would add custodians first)
  console.log('Step 2: Creating eDiscovery search...');
  
  const searchBody = {
    displayName: `Search_${Date.now()}`,
    description: `Content search: ${query}`,
    contentQuery: query,
    dataSourceScopes: mailboxes.length > 0 ? 'specificLocations' : 'allTenantMailboxes',
  };

  const createSearchResponse = await fetch(
    `https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/${caseId}/searches`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(searchBody),
    }
  );

  if (!createSearchResponse.ok) {
    const errorText = await createSearchResponse.text();
    console.error('Failed to create search:', errorText);
    // Fallback to Graph search
    return await executeGraphSearch(accessToken, query, mailboxes);
  }

  const search = await createSearchResponse.json();
  const searchId = search.id;
  console.log(`Created search: ${searchId}`);

  // Return export ID (in production, you would continue the workflow)
  // For now, return a response indicating the search was created
  return {
    exportId: searchId,
    caseId: caseId,
    status: 'processing',
    message: 'eDiscovery search created successfully. Full export workflow not yet implemented.',
    percentComplete: 10,
    note: 'This is a simplified implementation. Complete the workflow in Graph API console or implement remaining steps.',
  };
}

/**
 * Fallback: Use Graph search API for simple content search
 * This is less comprehensive than eDiscovery but works without special permissions
 */

interface EmailAddress {
  address?: string;
}

interface MessageFrom {
  emailAddress?: EmailAddress;
}

interface MessageResource {
  subject?: string;
  from?: MessageFrom;
  receivedDateTime?: string;
  bodyPreview?: string;
}

interface SearchHit {
  resource: MessageResource;
}

interface HitsContainer {
  hits?: SearchHit[];
}

interface SearchResponseValue {
  hitsContainers?: HitsContainer[];
}

interface GraphSearchResponse {
  value?: SearchResponseValue[];
}

interface GraphSearchResult {
  results: {
    subject: string;
    from: string;
    receivedDateTime: string;
    bodyPreview: string;
  }[];
  count: number;
  message: string;
}

async function executeGraphSearch(
  accessToken: string,
  query: string,
  mailboxes: string[]
): Promise<GraphSearchResult> {
  console.log('Using Graph search API as fallback...');
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Use Microsoft Graph search query API
  const searchBody = {
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
  };

  const searchResponse = await fetch(
    'https://graph.microsoft.com/v1.0/search/query',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(searchBody),
    }
  );

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Graph search failed: ${errorText}`);
  }

  const searchResults: GraphSearchResponse = await searchResponse.json();
  const hits = searchResults.value?.[0]?.hitsContainers?.[0]?.hits || [];

  const results = hits.map((hit) => {
    const resource = hit.resource;
    return {
      subject: resource.subject || '(no subject)',
      from: resource.from?.emailAddress?.address || 'Unknown',
      receivedDateTime: resource.receivedDateTime || new Date().toISOString(),
      bodyPreview: resource.bodyPreview || '',
    };
  });

  return {
    results,
    count: results.length,
    message: 'Search completed using Graph API (limited results)',
  };
}
