# Shared Supabase Client Utilities (DEPRECATED)

> **⚠️ IMPORTANT**: This shared module is no longer used by Edge Functions. All Edge Functions
> have been updated to be self-contained to prevent 500 errors during deployment or cold starts.
> 
> **DO NOT** import from this module in Edge Functions. Instead, inline the necessary helper
> functions directly in your Edge Function code.

This directory previously contained shared utility functions for Supabase Edge Functions.
The code remains here for reference only.

## Why Self-Contained?

Supabase Edge Functions can experience issues when importing from `_shared` modules:
- Module resolution failures during deployment
- 500 errors on cold starts
- Inconsistent behavior across deployments

## Functions to Inline

When creating new Edge Functions, copy these patterns directly into your function file:

### 1. Service Role Client (required for most functions)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

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
```

### 2. Credential Check (optional, for better error messages)

```typescript
interface CredentialCheckResult {
  configured: boolean;
  missing: string[];
}

function checkSupabaseCredentials(): CredentialCheckResult {
  const missing: string[] = [];
  
  if (!Deno.env.get('SUPABASE_URL')) missing.push('SUPABASE_URL');
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  return {
    configured: missing.length === 0,
    missing,
  };
}
```

### 3. Use Deno.serve Pattern

Always use `Deno.serve()` instead of importing from `deno.land/std`:

```typescript
// ✅ Correct
Deno.serve(async (req) => {
  // ...
});

// ❌ Deprecated - do NOT use
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
serve(handler);
```

## Example Functions

See these files for complete examples of self-contained Edge Functions:
- `sync-microsoft-365/index.ts` - Full M365 sync with credential checks
- `manage-user-roles/index.ts` - Simple admin function
- `reset-user-password/index.ts` - User management
