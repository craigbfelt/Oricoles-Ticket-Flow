/**
 * One-time setup function to create storage RLS policies
 * Uses service role to bypass permission restrictions
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
    console.log('Setting up storage policies...');
    
    const supabase = createServiceRoleClient();

    // SQL to create storage policies
    const policySQL = `
      -- Drop any existing policies first
      DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
      DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
      DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
      DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
      DROP POLICY IF EXISTS "diagrams_storage_insert" ON storage.objects;
      DROP POLICY IF EXISTS "diagrams_storage_select" ON storage.objects;
      DROP POLICY IF EXISTS "diagrams_storage_update" ON storage.objects;
      DROP POLICY IF EXISTS "diagrams_storage_delete" ON storage.objects;

      -- Enable RLS on storage.objects
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- Create storage policies for documents bucket
      CREATE POLICY "documents_storage_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'documents');

      CREATE POLICY "documents_storage_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'documents');

      CREATE POLICY "documents_storage_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'documents')
      WITH CHECK (bucket_id = 'documents');

      CREATE POLICY "documents_storage_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'documents');

      -- Create storage policies for diagrams bucket
      CREATE POLICY "diagrams_storage_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'diagrams');

      CREATE POLICY "diagrams_storage_select"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'diagrams');

      CREATE POLICY "diagrams_storage_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'diagrams')
      WITH CHECK (bucket_id = 'diagrams');

      CREATE POLICY "diagrams_storage_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'diagrams');
    `;

    // Execute the SQL using service role client
    const { error } = await supabase.rpc('exec_sql', { sql: policySQL }).single();

    if (error) {
      // If the exec_sql function doesn't exist, try direct query
      console.error('RPC exec_sql failed, trying direct approach:', error);
      
      // Try creating policies one by one
      const policies = [
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
        }
      ];

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not create policies via RPC. Policies need to be created manually in Supabase Dashboard.',
          message: 'Go to: Storage → Settings → Policies and create the policies for documents and diagrams buckets',
          policies: policies
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Storage policies created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage policies created successfully',
        policies: [
          'documents_storage_insert',
          'documents_storage_select', 
          'documents_storage_update',
          'documents_storage_delete',
          'diagrams_storage_insert',
          'diagrams_storage_select',
          'diagrams_storage_update', 
          'diagrams_storage_delete'
        ]
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