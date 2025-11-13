/**
 * Example Edge Function demonstrating how to bypass RLS using Service Role Key
 * 
 * This function shows how to use the service key for storage operations that
 * bypass Row Level Security policies. This is useful for:
 * - Bulk file operations
 * - System-level file management
 * - Administrative tasks
 * 
 * ⚠️ SECURITY WARNING:
 * - This function should only be called from trusted server environments
 * - Never expose service role key to client-side code
 * - Always validate and sanitize inputs
 * - Use authentication to verify caller identity
 */

import { createServiceRoleClient } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StorageOperationRequest {
  operation: 'upload' | 'delete' | 'list' | 'move';
  bucket: string;
  path?: string;
  file?: string; // base64 encoded file data
  newPath?: string; // for move operations
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the service role client that bypasses RLS
    const supabase = createServiceRoleClient();

    const { operation, bucket, path, file, newPath }: StorageOperationRequest = await req.json();

    console.log(`Executing storage operation: ${operation} on bucket: ${bucket}`);

    let result;

    switch (operation) {
      case 'upload': {
        if (!path || !file) {
          throw new Error('Path and file are required for upload operation');
        }

        // Decode base64 file data
        const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
        
        // Upload file - this bypasses RLS policies due to service role key
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, fileData, {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (error) throw error;
        
        result = { success: true, data };
        break;
      }

      case 'delete': {
        if (!path) {
          throw new Error('Path is required for delete operation');
        }

        // Delete file - bypasses RLS policies
        const { data, error } = await supabase.storage
          .from(bucket)
          .remove([path]);

        if (error) throw error;

        result = { success: true, data };
        break;
      }

      case 'list': {
        // List files - bypasses RLS policies, shows all files
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(path || '', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
          });

        if (error) throw error;

        result = { success: true, data };
        break;
      }

      case 'move': {
        if (!path || !newPath) {
          throw new Error('Path and newPath are required for move operation');
        }

        // Move file - bypasses RLS policies
        const { data, error } = await supabase.storage
          .from(bucket)
          .move(path, newPath);

        if (error) throw error;

        result = { success: true, data };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log('Operation completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in storage-admin-operations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
