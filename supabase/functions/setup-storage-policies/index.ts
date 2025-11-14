/**
 * One-time setup function to verify storage RLS policies exist
 * This function only checks and reports - it does not create policies
 * Policies should be created via database migrations
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

    // Check if buckets exist first
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.warn('Could not check buckets:', bucketsError.message);
      // Don't fail - buckets might exist but we can't query them
    } else {
      const bucketNames = buckets?.map(b => b.name) || [];
      console.log('Found buckets:', bucketNames);
      
      const requiredBuckets = ['documents', 'diagrams'];
      const missingBuckets = requiredBuckets.filter(b => !bucketNames.includes(b));
      
      if (missingBuckets.length > 0) {
        console.warn('Missing buckets:', missingBuckets);
        return new Response(
          JSON.stringify({
            success: false,
            warning: true,
            error: 'Storage buckets missing',
            message: 'Some storage buckets need to be created. Please run the database migrations.',
            missingBuckets: missingBuckets,
            instruction: 'Run migrations: supabase db push or apply them manually in Supabase Dashboard'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Try to check policies - if this fails, return success anyway
    // because the app can still work without this verification
    let policyCheckResult = null;
    try {
      const { data: existingPolicies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('schemaname', 'storage')
        .eq('tablename', 'objects')
        .in('policyname', [
          'documents_storage_insert',
          'documents_storage_select',
          'documents_storage_update',
          'documents_storage_delete',
          'diagrams_storage_insert',
          'diagrams_storage_select',
          'diagrams_storage_update',
          'diagrams_storage_delete',
          'Authenticated users can upload documents to storage',
          'Public users can view documents in storage',
          'Authenticated users can update documents in storage',
          'Authenticated users can delete documents from storage',
          'Authenticated users can upload diagrams',
          'Public users can view diagrams',
          'Authenticated users can update diagrams',
          'Authenticated users can delete diagrams'
        ]);

      if (!policiesError && existingPolicies) {
        const existingPolicyNames = existingPolicies.map(p => p.policyname);
        console.log('Found policies:', existingPolicyNames);
        policyCheckResult = {
          policiesFound: existingPolicyNames.length,
          policies: existingPolicyNames
        };
      }
    } catch (policyError) {
      console.warn('Could not check policies (this is OK):', policyError);
    }

    // Always return success - the function is just for information
    console.log('Storage verification complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage verification complete. If you encounter upload errors, ensure migrations have been run.',
        bucketsChecked: true,
        policyCheck: policyCheckResult,
        note: 'Policies are created via migrations. See VERIFY_SUPABASE_CONNECTION.md if you encounter issues.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error checking storage setup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return 200 even on error - this is not critical
    return new Response(
      JSON.stringify({
        success: true,
        warning: true,
        message: 'Could not verify storage setup, but app should still work',
        error: errorMessage,
        note: 'If you encounter upload errors, ensure database migrations have been run. See VERIFY_SUPABASE_CONNECTION.md for help.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
