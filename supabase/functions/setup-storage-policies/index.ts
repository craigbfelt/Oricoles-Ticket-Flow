/**
 * One-time setup function to verify storage RLS policies exist
 * Uses service role to check policy configuration
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

    // Check if policies exist by querying pg_policies
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
        'FileUpload 1iq1g9y_0',
        'FileUpload 1iq1g9y_1',
        'FileUpload 1iq1g9y_2',
        'FileUpload 1iq1g9y_3'
      ]);

    if (policiesError) {
      console.error('Error checking policies:', policiesError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not check existing policies',
          message: 'Failed to verify storage policies. Please check Supabase configuration.',
          details: policiesError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const expectedPolicies = [
      'documents_storage_insert',
      'documents_storage_select',
      'documents_storage_update',
      'documents_storage_delete',
      'diagrams_storage_insert',
      'diagrams_storage_select',
      'diagrams_storage_update',
      'diagrams_storage_delete',
      'FileUpload 1iq1g9y_0',
      'FileUpload 1iq1g9y_1',
      'FileUpload 1iq1g9y_2',
      'FileUpload 1iq1g9y_3'
    ];

    const existingPolicyNames = existingPolicies?.map(p => p.policyname) || [];
    const missingPolicies = expectedPolicies.filter(
      policy => !existingPolicyNames.includes(policy)
    );

    if (missingPolicies.length > 0) {
      console.warn('Missing policies:', missingPolicies);
      
      const policyDefinitions = [
        {
          name: 'documents_storage_insert',
          table: 'storage.objects',
          type: 'INSERT',
          role: 'authenticated',
          check: "bucket_id = 'documents'"
        },
        {
          name: 'documents_storage_select', 
          table: 'storage.objects',
          type: 'SELECT',
          role: 'public',
          using: "bucket_id = 'documents'"
        },
        {
          name: 'documents_storage_update',
          table: 'storage.objects', 
          type: 'UPDATE',
          role: 'authenticated',
          using: "bucket_id = 'documents'",
          check: "bucket_id = 'documents'"
        },
        {
          name: 'documents_storage_delete',
          table: 'storage.objects',
          type: 'DELETE', 
          role: 'authenticated',
          using: "bucket_id = 'documents'"
        },
        {
          name: 'diagrams_storage_insert',
          table: 'storage.objects',
          type: 'INSERT',
          role: 'authenticated',
          check: "bucket_id = 'diagrams'"
        },
        {
          name: 'diagrams_storage_select',
          table: 'storage.objects',
          type: 'SELECT',
          role: 'public',
          using: "bucket_id = 'diagrams'"
        },
        {
          name: 'diagrams_storage_update',
          table: 'storage.objects',
          type: 'UPDATE',
          role: 'authenticated',
          using: "bucket_id = 'diagrams'",
          check: "bucket_id = 'diagrams'"
        },
        {
          name: 'diagrams_storage_delete',
          table: 'storage.objects',
          type: 'DELETE',
          role: 'authenticated',
          using: "bucket_id = 'diagrams'"
        },
        {
          name: 'FileUpload 1iq1g9y_0',
          table: 'storage.objects',
          type: 'SELECT',
          role: 'public',
          using: "bucket_id = 'FileBucket'"
        },
        {
          name: 'FileUpload 1iq1g9y_1',
          table: 'storage.objects',
          type: 'INSERT',
          role: 'public',
          check: "bucket_id = 'FileBucket'"
        },
        {
          name: 'FileUpload 1iq1g9y_2',
          table: 'storage.objects',
          type: 'UPDATE',
          role: 'public',
          using: "bucket_id = 'FileBucket'",
          check: "bucket_id = 'FileBucket'"
        },
        {
          name: 'FileUpload 1iq1g9y_3',
          table: 'storage.objects',
          type: 'DELETE',
          role: 'public',
          using: "bucket_id = 'FileBucket'"
        }
      ];

      return new Response(
        JSON.stringify({
          success: false,
          warning: true,
          error: 'Some storage policies are missing. Please run database migrations or create them manually.',
          message: 'Missing policies should be created via migrations. Run: supabase db push or create them manually in Supabase Dashboard under Storage → Settings → Policies',
          missingPolicies: missingPolicies,
          policyDefinitions: policyDefinitions.filter(p => missingPolicies.includes(p.name))
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('All storage policies exist');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All storage policies are configured correctly',
        policies: existingPolicyNames
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error checking storage policies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        note: 'Storage policies must be created via Supabase Dashboard under Storage → Settings → Policies or via database migrations'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
