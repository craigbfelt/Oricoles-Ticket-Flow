# Shared Supabase Client Utilities

This directory contains shared utility functions for Supabase Edge Functions.

## Files

### `supabase.ts`

Provides three types of Supabase clients for different use cases, plus a credential check utility:

#### Credential Check

```typescript
import { checkSupabaseCredentials } from '../_shared/supabase.ts';

// Check if required environment variables are configured
const credCheck = checkSupabaseCredentials();
if (!credCheck.configured) {
  // Handle missing configuration
  console.error('Missing:', credCheck.missing.join(', '));
}
```

Use this to validate configuration before creating clients, enabling user-friendly error messages.

#### 1. Service Role Client

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();
```

**⚠️ WARNING**: Bypasses all Row Level Security (RLS) policies!

**Use for:**
- Administrative operations
- Bulk data processing
- System-level tasks
- Cross-user operations

**Never use for:**
- Client-facing operations
- User-specific queries where RLS should apply

#### 2. Anon Client

```typescript
import { createAnonClient } from '../_shared/supabase.ts';

const supabase = createAnonClient();
```

Respects RLS policies. Use for public operations.

#### 3. Authenticated Client

```typescript
import { createAuthenticatedClient } from '../_shared/supabase.ts';

const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const supabase = createAuthenticatedClient(token);
```

Respects RLS policies but acts as a specific authenticated user.

## Usage Examples

### Edge Function with Service Role Client

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const supabase = createServiceRoleClient();
  
  // Perform admin operations
  const { data, error } = await supabase
    .from('some_table')
    .select('*');
    
  return new Response(JSON.stringify(data));
});
```

### Edge Function with User Context

```typescript
import { createAuthenticatedClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const supabase = createAuthenticatedClient(token);
  
  // Operations run as the authenticated user
  const { data, error } = await supabase
    .from('user_data')
    .select('*');
    
  return new Response(JSON.stringify(data));
});
```

## Security Best Practices

1. **Use the right client for the job**: Default to authenticated or anon clients. Only use service role when necessary.

2. **Validate inputs**: Always validate user inputs before using them with service role client.

3. **Audit logging**: Log all service role operations for security auditing.

4. **Error handling**: Don't expose internal errors to clients.

See [BYPASS_ACCESS_CONTROLS_GUIDE.md](../../BYPASS_ACCESS_CONTROLS_GUIDE.md) for comprehensive security guidelines.
