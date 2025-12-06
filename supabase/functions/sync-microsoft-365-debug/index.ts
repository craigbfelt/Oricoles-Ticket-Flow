// sync-microsoft-365-debug.ts
// Safe diagnostic Edge Function for Microsoft token checks
// Deploy as an Edge Function named 'sync-microsoft-365-debug'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Maximum characters to return from raw response text for debugging
const MAX_RAW_RESPONSE_LENGTH = 1000;

console.info('sync-microsoft-365-debug starting');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenant = Deno.env.get('MICROSOFT_TENANT_ID') ?? null;
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID') ?? null;
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET') ?? null;

    const missing: string[] = [];
    if (!tenant) missing.push('MICROSOFT_TENANT_ID');
    if (!clientId) missing.push('MICROSOFT_CLIENT_ID');
    if (!clientSecret) missing.push('MICROSOFT_CLIENT_SECRET');

    if (missing.length) {
      return new Response(JSON.stringify({ ok: false, reason: 'missing_env', missing }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // At this point, all credentials are validated as non-null
    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'https://graph.microsoft.com/.default');

    const tokenRes = await fetch(url, { method: 'POST', body: params });
    const contentType = tokenRes.headers.get('content-type') || '';
    let tokenBody: Record<string, unknown> | null = null;
    try {
      if (contentType.includes('application/json')) {
        tokenBody = await tokenRes.json();
      } else {
        const rawText = await tokenRes.text();
        tokenBody = { raw: rawText.slice(0, MAX_RAW_RESPONSE_LENGTH) };
      }
    } catch (e) {
      tokenBody = { parse_error: e instanceof Error ? e.message : String(e) };
    }

    if (!tokenRes.ok) {
      // Return safe, non-secret details
      const safe = {
        ok: false,
        reason: 'token_error',
        status: tokenRes.status,
        error: tokenBody?.error ?? null,
        error_description: tokenBody?.error_description ?? null,
      };
      return new Response(JSON.stringify(safe), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Success — return minimal token metadata only
    const safeOk = {
      ok: true,
      reason: 'token_ok',
      expires_in: tokenBody?.expires_in ?? null,
      token_type: tokenBody?.token_type ?? null,
      scope: tokenBody?.scope ?? null,
    };

    return new Response(JSON.stringify(safeOk), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ 
        ok: false, 
        reason: 'exception', 
        message: err instanceof Error ? err.message : String(err) 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
