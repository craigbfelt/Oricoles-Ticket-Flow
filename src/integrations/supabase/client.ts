// Supabase client configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Validate required environment variables
if (!isSupabaseConfigured) {
  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_PUBLISHABLE_KEY) missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  
  console.error(
    `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
    'Please set these in your Vercel project settings or .env file.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Only create the client if configuration is valid
// When not configured, create a mock client that will show errors when used
let supabaseClient: SupabaseClient<Database>;

if (isSupabaseConfigured) {
  supabaseClient = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
} else {
  // Create a placeholder URL that won't throw during client creation
  // The isSupabaseConfigured check in App.tsx will prevent usage
  // Using example.com (reserved per RFC 2606) to ensure we never connect to a real service
  supabaseClient = createClient<Database>(
    'https://example.supabase.co',
    'UNCONFIGURED-KEY-DO-NOT-USE',
    {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
}

export const supabase = supabaseClient;