import { createServiceRoleClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      // Insert or update client registration
      const { data, error } = await supabase
        .from('remote_clients')
        .upsert(
          {
            registration_token: clientData.registration_token,
            computer_name: clientData.computer_name,
            username: clientData.username,
            os_version: clientData.os_version,
            ip_address: clientData.ip_address,
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