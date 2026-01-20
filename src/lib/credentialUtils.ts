/**
 * Utility functions for fetching credentials with graceful fallback
 * 
 * This module handles the transition between unencrypted and encrypted credentials.
 * When the get_decrypted_credentials RPC function doesn't exist (404), we fall back
 * to direct table queries silently without polluting the console with errors.
 * 
 * The RPC availability is cached in localStorage to avoid repeated 404 errors
 * which would clutter the browser's network tab.
 */

import { supabase } from "@/integrations/supabase/client";

// Constants for encrypted credential display
export const ENCRYPTED_PASSWORD_PLACEHOLDER = '***ENCRYPTED***';
export const ENCRYPTED_PASSWORD_DISPLAY = '••••••••';

// Storage key for caching RPC availability
const RPC_CACHE_KEY = 'oricol_rpc_decrypted_credentials_available';
const RPC_CACHE_EXPIRY_KEY = 'oricol_rpc_decrypted_credentials_expiry';
// Cache expiry: 1 hour (in milliseconds) - recheck periodically in case migrations were applied
const RPC_CACHE_DURATION = 60 * 60 * 1000;

// In-memory cache for whether the RPC function exists (to avoid localStorage reads on every call)
let rpcFunctionExists: boolean | null = null;
let rpcCheckInProgress: Promise<boolean> | null = null;

/**
 * Get cached RPC availability from localStorage
 * Returns null if not cached or expired
 */
function getCachedRpcAvailability(): boolean | null {
  try {
    const cached = localStorage.getItem(RPC_CACHE_KEY);
    const expiry = localStorage.getItem(RPC_CACHE_EXPIRY_KEY);
    
    if (cached !== null && expiry !== null) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime) {
        return cached === 'true';
      }
    }
  } catch {
    // localStorage not available (SSR, private browsing, etc.)
  }
  return null;
}

/**
 * Cache RPC availability in localStorage
 */
function setCachedRpcAvailability(available: boolean): void {
  try {
    localStorage.setItem(RPC_CACHE_KEY, String(available));
    localStorage.setItem(RPC_CACHE_EXPIRY_KEY, String(Date.now() + RPC_CACHE_DURATION));
  } catch {
    // localStorage not available
  }
}

/**
 * Check if the get_decrypted_credentials RPC function exists in the database.
 * Results are cached in memory and localStorage to avoid repeated 404 errors.
 */
async function checkRpcFunctionExists(): Promise<boolean> {
  // Return in-memory cached result if available
  if (rpcFunctionExists !== null) {
    return rpcFunctionExists;
  }
  
  // Check localStorage cache
  const cachedResult = getCachedRpcAvailability();
  if (cachedResult !== null) {
    rpcFunctionExists = cachedResult;
    return cachedResult;
  }
  
  // If a check is already in progress, wait for it
  if (rpcCheckInProgress) {
    return rpcCheckInProgress;
  }
  
  // Start the check
  rpcCheckInProgress = (async () => {
    try {
      // Try calling the function with a test that should work if it exists
      const { error } = await supabase.rpc('get_decrypted_credentials', { p_service_type: null });
      
      // If there's no error, the function exists
      if (!error) {
        rpcFunctionExists = true;
        setCachedRpcAvailability(true);
        return true;
      }
      
      // Check if the error indicates the function doesn't exist using error codes
      // PostgreSQL error code 42883 = undefined_function
      // PostgREST error code PGRST202 = function not found
      const errorCode = error.code;
      const isNotFoundError = 
        errorCode === '42883' ||
        errorCode === 'PGRST202';
      
      if (isNotFoundError) {
        rpcFunctionExists = false;
        setCachedRpcAvailability(false);
        return false;
      }
      
      // For permission errors (42501 = insufficient_privilege), the function exists
      // but user can't access it - we should fall back to direct query
      if (errorCode === '42501') {
        // Function exists but access denied - cache as not available for this user
        rpcFunctionExists = false;
        setCachedRpcAvailability(false);
        return false;
      }
      
      // For other errors, assume function doesn't exist to avoid noise
      rpcFunctionExists = false;
      setCachedRpcAvailability(false);
      return false;
    } catch {
      rpcFunctionExists = false;
      setCachedRpcAvailability(false);
      return false;
    } finally {
      rpcCheckInProgress = null;
    }
  })();
  
  return rpcCheckInProgress;
}

export interface VpnRdpCredential {
  id: string;
  username: string;
  password: string;
  service_type: "VPN" | "RDP";
  email: string | null;
  notes: string | null;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch credentials with graceful fallback.
 * 
 * If the get_decrypted_credentials RPC function exists, it will be used to fetch
 * decrypted credentials. Otherwise, falls back to direct table query.
 * 
 * @param serviceType - Optional filter by service type ('VPN' or 'RDP')
 * @returns Array of credentials
 */
export async function fetchCredentials(
  serviceType?: 'VPN' | 'RDP'
): Promise<{ data: VpnRdpCredential[] | null; error: Error | null }> {
  try {
    // Check if RPC function exists (cached check)
    const rpcExists = await checkRpcFunctionExists();
    
    if (rpcExists) {
      // Use the secure RPC function
      const { data, error } = await supabase.rpc('get_decrypted_credentials', {
        p_service_type: serviceType || null,
      });
      
      if (!error && data) {
        return { data: data as VpnRdpCredential[], error: null };
      }
      
      // If RPC failed with a permission error (42501 = insufficient_privilege),
      // that's expected for non-admin users - fall through to direct query
      if (error?.code === '42501') {
        console.debug('get_decrypted_credentials: Permission denied, falling back to direct query');
      }
    }
    
    // Fallback to direct table query
    let query = supabase
      .from("vpn_rdp_credentials")
      .select("*")
      .order("username");
    
    if (serviceType) {
      query = query.eq("service_type", serviceType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as VpnRdpCredential[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch credentials'),
    };
  }
}

/**
 * Fetch credentials filtered by having an email address.
 * Used for importing staff users as system users.
 * 
 * @returns Array of credentials with email addresses
 */
export async function fetchCredentialsWithEmail(): Promise<{
  data: VpnRdpCredential[] | null;
  error: Error | null;
}> {
  try {
    // Check if RPC function exists (cached check)
    const rpcExists = await checkRpcFunctionExists();
    
    if (rpcExists) {
      // Use the secure RPC function
      const { data, error } = await supabase.rpc('get_decrypted_credentials');
      
      if (!error && data) {
        // Filter to only include users with email
        const withEmail = (data as VpnRdpCredential[]).filter(
          (u) => u.email != null && u.email !== ''
        );
        return { data: withEmail, error: null };
      }
      
      // If RPC failed with a permission error (42501 = insufficient_privilege),
      // fall through to direct query
      if (error?.code === '42501') {
        console.debug('get_decrypted_credentials: Permission denied, falling back to direct query');
      }
    }
    
    // Fallback to direct table query
    const { data, error } = await supabase
      .from("vpn_rdp_credentials")
      .select("*")
      .not("email", "is", null)
      .order("username");
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as VpnRdpCredential[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to fetch credentials'),
    };
  }
}

/**
 * Reset the RPC function check cache.
 * Useful for testing or when the database schema might have changed.
 * Clears both in-memory and localStorage caches.
 */
export function resetRpcCache(): void {
  rpcFunctionExists = null;
  rpcCheckInProgress = null;
  try {
    localStorage.removeItem(RPC_CACHE_KEY);
    localStorage.removeItem(RPC_CACHE_EXPIRY_KEY);
  } catch {
    // localStorage not available
  }
}

/**
 * Utility function to display password in a user-friendly way.
 * If password is encrypted (shows the placeholder), displays masked password.
 * Otherwise displays the actual password or fallback text.
 * 
 * @param password - The password value to display (may be encrypted placeholder)
 * @param fallback - Text to show if password is empty/null (default: "—")
 * @returns Formatted password display string
 */
export function displayPassword(password: string | null | undefined, fallback: string = "—"): string {
  if (!password) return fallback;
  if (password === ENCRYPTED_PASSWORD_PLACEHOLDER) {
    return ENCRYPTED_PASSWORD_DISPLAY;
  }
  return password;
}
