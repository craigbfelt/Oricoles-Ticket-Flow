// Secure wrapper: enforce JWT verification and admin claim before performing admin storage operations.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // must be set in Secret env for functions

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const bodySchema = z.object({
  operation: z.enum(['upload','delete','list','move']),
  bucket: z.string().min(1),
  path: z.string().optional(),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Enforce Authorization header (JWT) present and valid
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      console.warn('Unauthorized attempt: missing Bearer token');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const jwt = authHeader.slice(7);

    // Verify JWT using Supabase Admin endpoint
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.warn('Unauthorized attempt: invalid JWT', { authError });
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Check if the requesting user is an admin from database
    const { data: adminCheck, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminError || !adminCheck) {
      console.warn('Forbidden: user lacks admin role', { userId: user.id, adminError });
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Validate input
    let json;
    try {
      json = await req.json();
    } catch (e) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }
    
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, bucket, path } = parsed.data;
    
    // Implement safe admin operations here (example: list/delete)
    if (operation === 'list') {
      const { data, error } = await supabase.storage.from(bucket).list(path || '');
      if (error) throw error;
      return new Response(
        JSON.stringify(data), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (operation === 'delete') {
      if (!path) {
        return new Response(
          'Bad Request: path is required for delete', 
          { status: 400, headers: corsHeaders }
        );
      }
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response('Not Implemented', { status: 501, headers: corsHeaders });
  } catch (err) {
    console.error('Admin operation failed', err);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
});
