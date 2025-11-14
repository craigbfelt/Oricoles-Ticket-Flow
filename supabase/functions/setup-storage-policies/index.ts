/**
 * Verification function to check storage RLS policies
 * 
 * This function verifies that storage policies exist for documents and diagrams buckets.
 * Policies should be created via database migrations, not through this edge function.
 * 
 * Uses service role to query system catalogs and check policy existence.
 */

import { createServiceRoleClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking storage policies...');
    
    const supabase = createServiceRoleClient();

    // Expected policies for documents and diagrams buckets
    const expectedPolicies = [
      'Authenticated users can upload documents to storage',
      'Public users can view documents in storage',
      'Authenticated users can update documents in storage',
      'Authenticated users can delete documents from storage',
      'Authenticated users can upload diagrams',
      'Public users can view diagrams',
      'Authenticated users can update diagrams',
      'Authenticated users can delete diagrams'
    ];

    // Query to check if policies exist in pg_policies view
    const { data: existingPolicies, error: queryError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')
      .in('policyname', expectedPolicies);

    if (queryError) {
      console.error('Error querying policies:', queryError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not query existing policies',
          message: 'Storage policies should be created via database migrations. Check supabase/migrations/ for policy creation scripts.',
          hint: 'Ensure migrations have been applied: supabase db push'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if all expected policies exist
    const foundPolicyNames = existingPolicies?.map(p => p.policyname) || [];
    const missingPolicies = expectedPolicies.filter(p => !foundPolicyNames.includes(p));

    if (missingPolicies.length > 0) {
      console.log('Missing policies:', missingPolicies);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Some storage policies are missing',
          message: 'Storage policies should be created via database migrations, not via this edge function.',
          instructions: [
            '1. Ensure all migrations in supabase/migrations/ have been applied',
            '2. Run: supabase db push',
            '3. Check migrations: 20251113151700_fix_documents_storage_policies.sql and 20251113111200_create_diagrams_storage_bucket.sql'
          ],
          missingPolicies,
          foundPolicies: foundPolicyNames
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('All storage policies exist');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage policies verified successfully',
        policies: foundPolicyNames,
        note: 'Policies are managed via database migrations in supabase/migrations/'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error setting up storage policies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        note: 'Storage policies must be created via Supabase Dashboard under Storage → Settings → Policies'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});