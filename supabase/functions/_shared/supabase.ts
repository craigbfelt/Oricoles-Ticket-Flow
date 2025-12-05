/**
 * Shared Supabase client utilities for Edge Functions
 * 
 * This module provides two types of Supabase clients:
 * 1. Service Role Client - Bypasses RLS policies (use with caution)
 * 2. Authenticated Client - Respects RLS policies
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

/**
 * Check if Supabase service role credentials are configured
 * Returns an object with the status and any missing credentials
 * 
 * Use this function for early validation before calling createServiceRoleClient()
 * to provide user-friendly error messages when configuration is missing.
 */
export function checkSupabaseCredentials(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!Deno.env.get('SUPABASE_URL')) missing.push('SUPABASE_URL');
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Creates a Supabase client with the SERVICE ROLE key
 * 
 * ⚠️ WARNING: This client BYPASSES all Row Level Security (RLS) policies!
 * 
 * Use cases:
 * - Server-side operations that need unrestricted database access
 * - Bulk operations across multiple users
 * - System-level tasks (migrations, cleanup, reporting)
 * - Storage operations that bypass RLS policies
 * 
 * Security considerations:
 * - NEVER expose this client to client-side code
 * - NEVER share the service role key publicly
 * - Only use in trusted server environments (Edge Functions)
 * - Always validate and sanitize user input before using this client
 * - Consider using authenticated client when possible
 * 
 * @returns Supabase client with service role privileges
 * @throws Error if environment variables are not set
 */
export function createServiceRoleClient() {
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
 * Creates a Supabase client with the ANON key
 * 
 * This client respects all Row Level Security (RLS) policies.
 * Use this for user-scoped operations.
 * 
 * @returns Supabase client with anon key
 * @throws Error if environment variables are not set
 */
export function createAnonClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client authenticated as a specific user
 * 
 * This client will respect RLS policies but act as the specified user.
 * Useful for operations on behalf of a user.
 * 
 * @param accessToken - JWT access token of the user
 * @returns Supabase client authenticated as the user
 * @throws Error if environment variables are not set
 */
export function createAuthenticatedClient(accessToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
