import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

/**
 * Edge Function to mark migrations as applied
 * 
 * This function allows users to mark migrations as applied in the schema_migrations table.
 * This is useful when migrations have been manually run but weren't tracked.
 * 
 * Requires admin role to use.
 * 
 * Request body:
 * - migrations: string[] - Array of migration version strings to mark as applied
 *   Example: ["20251100000000_create_schema_migrations_table", "20251108052000_bee9ee20-5a81-402a-bdd9-30cce8e8ecb7"]
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabase = createServiceRoleClient();
    
    // Extract JWT token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ success: false, error: 'Access denied. Only admins can mark migrations as applied.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { migrations } = body;

    if (!Array.isArray(migrations) || migrations.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request. migrations array required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate migration version format (should be alphanumeric with underscores and hyphens)
    const validVersionRegex = /^[a-zA-Z0-9_-]+$/;
    const invalidMigrations = migrations.filter(m => !validVersionRegex.test(m));
    if (invalidMigrations.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid migration version format: ${invalidMigrations.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize migration versions (remove .sql extension if present for consistency)
    const normalizedMigrations = migrations.map(version => version.replace(/\.sql$/, ''));

    // Insert migrations as applied
    const migrationRecords = normalizedMigrations.map(version => ({
      version,
      applied_at: new Date().toISOString()
    }));

    // Use upsert to handle duplicates gracefully
    const { data: insertData, error: insertError } = await supabase
      .from('schema_migrations')
      .upsert(migrationRecords, { 
        onConflict: 'version',
        ignoreDuplicates: true 
      })
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to mark migrations as applied: ${insertError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get updated list of applied migrations
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('schema_migrations')
      .select('version, applied_at')
      .order('version', { ascending: true });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully marked ${normalizedMigrations.length} migration(s) as applied`,
        markedMigrations: normalizedMigrations,
        totalApplied: appliedMigrations?.length || 0,
        appliedMigrations: appliedMigrations || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error marking migrations as applied:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
