import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
};

/**
 * Creates a Supabase client with the SERVICE ROLE key
 * 
 * ⚠️ WARNING: This client BYPASSES all Row Level Security (RLS) policies!
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

interface ClientRegistration {
  registration_token: string;
  computer_name: string;
  username: string;
  os_version?: string;
  ip_address?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the shared service role client (bypasses RLS for client registration)
    const supabase = createServiceRoleClient();

    if (req.method === 'POST') {
      const clientData: ClientRegistration = await req.json();

      console.log('Registering client:', clientData);

      // Validate required fields
      if (!clientData.registration_token || !clientData.computer_name || !clientData.username) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: registration_token, computer_name, and username are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate registration token format (basic sanitization)
      if (typeof clientData.registration_token !== 'string' || clientData.registration_token.length < 10 || clientData.registration_token.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Invalid registration token format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sanitize string inputs to prevent injection
      const sanitizedData = {
        registration_token: clientData.registration_token.trim(),
        computer_name: clientData.computer_name.trim().substring(0, 255),
        username: clientData.username.trim().substring(0, 255),
        os_version: clientData.os_version?.trim().substring(0, 255),
        ip_address: clientData.ip_address?.trim().substring(0, 45), // Max IPv6 length
      };

      // Insert or update client registration
      const { data, error } = await supabase
        .from('remote_clients')
        .upsert(
          {
            registration_token: sanitizedData.registration_token,
            computer_name: sanitizedData.computer_name,
            username: sanitizedData.username,
            os_version: sanitizedData.os_version,
            ip_address: sanitizedData.ip_address,
            last_seen_at: new Date().toISOString(),
            status: 'online',
          },
          { onConflict: 'registration_token' }
        )
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to register client', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Client registered successfully:', data);

      return new Response(
        JSON.stringify({ success: true, client: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      // Heartbeat update
      const { registration_token } = await req.json();

      // Validate registration token
      if (!registration_token || typeof registration_token !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing registration_token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('remote_clients')
        .update({
          last_seen_at: new Date().toISOString(),
          status: 'online',
        })
        .eq('registration_token', registration_token)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to update heartbeat' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, client: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});