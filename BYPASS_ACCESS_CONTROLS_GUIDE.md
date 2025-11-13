# Bypassing Access Controls with Service Key

## Overview

This guide explains how to bypass Row Level Security (RLS) policies in Supabase Storage using the service role key. This is useful for trusted server-side operations that require unrestricted access to storage.

## ⚠️ CRITICAL SECURITY WARNING

The service role key grants **complete, unrestricted access** to your entire Supabase project, bypassing all Row Level Security policies. Misuse can lead to severe security vulnerabilities.

### Security Rules

**NEVER:**
- ❌ Expose the service key in client-side code
- ❌ Commit the service key to version control
- ❌ Share the service key publicly or with untrusted parties
- ❌ Use the service key in frontend applications
- ❌ Send the service key over insecure channels

**ALWAYS:**
- ✅ Use the service key only in trusted server environments (Edge Functions, backend services)
- ✅ Store the service key as an environment variable
- ✅ Validate and sanitize all user inputs before using with service key
- ✅ Log all operations performed with the service key for audit purposes
- ✅ Consider using authenticated clients when possible

## When to Use the Service Key

Use the service key to bypass RLS when you need to:

1. **Bulk Operations**: Process files across multiple users or accounts
2. **System Administration**: Perform cleanup, migrations, or maintenance tasks
3. **Cross-User Operations**: Operations that need to access data from multiple users
4. **Backend Services**: Server-to-server communication where RLS is not needed
5. **Scheduled Jobs**: Automated tasks running on a schedule

## Implementation

### 1. Environment Variables

The service key is already configured in your Supabase Edge Functions environment. The following environment variables are automatically available:

```
SUPABASE_URL=<your-project-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

### 2. Using the Shared Client Utility

We've created a shared utility module that provides easy access to service role clients:

**Location**: `supabase/functions/_shared/supabase.ts`

**Usage Example**:

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

// Create a client that bypasses RLS
const supabase = createServiceRoleClient();

// Now all operations bypass RLS policies
const { data, error } = await supabase.storage
  .from('documents')
  .upload('path/to/file.pdf', fileData);
```

### 3. Storage Operations

#### Uploading Files (Bypassing RLS)

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();

// Upload file - bypasses all RLS policies
const { data, error } = await supabase.storage
  .from('documents')
  .upload('admin/report.pdf', fileBuffer, {
    contentType: 'application/pdf',
    upsert: true, // Overwrite if exists
  });

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('File uploaded successfully:', data);
}
```

#### Deleting Files (Bypassing RLS)

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();

// Delete files - bypasses RLS policies
const { data, error } = await supabase.storage
  .from('documents')
  .remove(['path/to/file1.pdf', 'path/to/file2.pdf']);
```

#### Listing Files (Bypassing RLS)

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();

// List all files in bucket - sees ALL files regardless of RLS
const { data, error } = await supabase.storage
  .from('documents')
  .list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
```

#### Moving Files (Bypassing RLS)

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();

// Move file - bypasses RLS policies
const { data, error } = await supabase.storage
  .from('documents')
  .move('old/path/file.pdf', 'new/path/file.pdf');
```

### 4. Database Operations

The service key also bypasses RLS for database operations:

```typescript
import { createServiceRoleClient } from '../_shared/supabase.ts';

const supabase = createServiceRoleClient();

// Query data across all users - bypasses RLS
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .order('created_at', { ascending: false });

// Insert data - bypasses RLS
const { data: inserted, error: insertError } = await supabase
  .from('documents')
  .insert({
    filename: 'system-report.pdf',
    uploaded_by: null, // Can insert without user context
    // ... other fields
  });
```

## Example Edge Function

We've included a complete example Edge Function that demonstrates bypassing RLS for storage operations:

**Location**: `supabase/functions/storage-admin-operations/index.ts`

This function provides an API for performing administrative storage operations:
- Upload files to any location
- Delete files from any location
- List all files in a bucket
- Move files between locations

### Calling the Example Function

```typescript
// From another Edge Function or backend service
const response = await fetch('https://your-project.supabase.co/functions/v1/storage-admin-operations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
  },
  body: JSON.stringify({
    operation: 'upload',
    bucket: 'documents',
    path: 'admin/system-report.pdf',
    file: base64EncodedFileData,
  }),
});

const result = await response.json();
console.log(result);
```

## Alternative: Using the Authorization Header

Instead of using the shared client utility, you can also bypass RLS by setting the Authorization header manually:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceKey);

// Or with explicit headers
const response = await fetch(`${supabaseUrl}/storage/v1/object/documents/file.pdf`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceKey}`, // Service key in header
    'Content-Type': 'application/pdf',
  },
  body: fileData,
});
```

## Client Types Comparison

| Client Type | Created With | Bypasses RLS? | Use Case |
|-------------|-------------|---------------|----------|
| Service Role | `createServiceRoleClient()` | ✅ Yes | Trusted server operations |
| Anon | `createAnonClient()` | ❌ No | Public operations |
| Authenticated | `createAuthenticatedClient(token)` | ❌ No | User-specific operations |

## Best Practices

1. **Principle of Least Privilege**: Use authenticated or anon clients whenever possible. Only use service key when absolutely necessary.

2. **Input Validation**: Always validate and sanitize user inputs before using them in service role operations:

   ```typescript
   // Bad - vulnerable to injection
   const path = userInput;
   await supabase.storage.from('documents').remove([path]);

   // Good - validated input
   if (!/^[a-zA-Z0-9/_-]+\.(pdf|docx)$/.test(userInput)) {
     throw new Error('Invalid file path');
   }
   const path = userInput;
   await supabase.storage.from('documents').remove([path]);
   ```

3. **Audit Logging**: Log all service key operations:

   ```typescript
   console.log('[SERVICE_ROLE_OPERATION]', {
     operation: 'delete',
     bucket: 'documents',
     path: filePath,
     timestamp: new Date().toISOString(),
   });
   ```

4. **Error Handling**: Properly handle and log errors:

   ```typescript
   try {
     const { data, error } = await supabase.storage
       .from('documents')
       .upload(path, file);
     
     if (error) throw error;
     
     return { success: true, data };
   } catch (error) {
     console.error('[SERVICE_ROLE_ERROR]', error);
     // Don't expose internal errors to clients
     throw new Error('Storage operation failed');
   }
   ```

5. **Environment-Specific Keys**: Use different service keys for development, staging, and production environments.

## Getting Your Service Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Find the **service_role** key (NOT the anon key)
5. Copy the key and store it securely as an environment variable

**Never** commit this key to version control!

## Troubleshooting

### "Missing required environment variables" error

**Cause**: The service role key is not set in your environment.

**Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your Edge Function environment or `.env` file.

### Operations still failing with RLS errors

**Cause**: You might be using the wrong client or key.

**Solution**: 
1. Verify you're using `createServiceRoleClient()` not `createAnonClient()`
2. Check that the service key is correct (not the anon key)
3. Verify the key has not expired or been rotated

### Unauthorized errors

**Cause**: Service key might be incorrect or not properly set.

**Solution**:
1. Double-check the service key from Supabase Dashboard
2. Ensure environment variable is properly set
3. Try redeploying the Edge Function

## Further Reading

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Service Role Key](https://supabase.com/docs/guides/api/api-keys)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)

## Summary

The service role key provides powerful capabilities for bypassing RLS policies, but with great power comes great responsibility. Always:

1. Use only in trusted server environments
2. Never expose to client-side code
3. Validate all inputs thoroughly
4. Log all operations for audit trails
5. Consider using authenticated clients when possible

Remember: **The service key should NEVER be shared publicly!**
