# Testing Storage Admin Operations

This guide shows how to test the storage admin operations Edge Function that bypasses RLS policies.

## Prerequisites

1. Ensure you have deployed the Edge Function to your Supabase project
2. Have your Supabase project URL and anon key ready
3. The Edge Function should be configured with `verify_jwt = false` in `config.toml`

## Deploying the Edge Function

```bash
# Navigate to your project directory
cd /path/to/oricol-ticket-flow-34e64301

# Deploy the storage-admin-operations function
npx supabase functions deploy storage-admin-operations

# Or deploy all functions
npx supabase functions deploy
```

## Testing from Command Line

### Upload a File

```bash
# Create a test file
echo "Hello, World!" > test.txt

# Convert to base64
BASE64_FILE=$(base64 -w 0 test.txt)

# Make the request
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-admin-operations' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw "{
    \"operation\": \"upload\",
    \"bucket\": \"documents\",
    \"path\": \"test/admin-upload.txt\",
    \"file\": \"$BASE64_FILE\"
  }"
```

### List Files

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-admin-operations' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw '{
    "operation": "list",
    "bucket": "documents",
    "path": ""
  }'
```

### Delete a File

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-admin-operations' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw '{
    "operation": "delete",
    "bucket": "documents",
    "path": "test/admin-upload.txt"
  }'
```

### Move a File

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/storage-admin-operations' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  --data-raw '{
    "operation": "move",
    "bucket": "documents",
    "path": "old/path/file.txt",
    "newPath": "new/path/file.txt"
  }'
```

## Testing from JavaScript/TypeScript

### In a Node.js or Deno Script

```typescript
// test-storage-admin.ts

async function testStorageAdmin() {
  const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
  const ANON_KEY = 'YOUR_ANON_KEY';
  
  // Example: Upload a file
  const fileContent = 'This is a test file';
  const base64File = btoa(fileContent);
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/storage-admin-operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'upload',
        bucket: 'documents',
        path: 'test/example.txt',
        file: base64File,
      }),
    }
  );
  
  const result = await response.json();
  console.log('Upload result:', result);
  
  // Example: List files
  const listResponse = await fetch(
    `${SUPABASE_URL}/functions/v1/storage-admin-operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        operation: 'list',
        bucket: 'documents',
        path: 'test',
      }),
    }
  );
  
  const listResult = await listResponse.json();
  console.log('Files:', listResult);
}

testStorageAdmin().catch(console.error);
```

### From Another Edge Function

```typescript
// supabase/functions/my-function/index.ts
import { createServiceRoleClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  // Option 1: Call the storage-admin-operations function
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/storage-admin-operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        operation: 'upload',
        bucket: 'documents',
        path: 'system/report.pdf',
        file: base64FileData,
      }),
    }
  );
  
  // Option 2: Use the service role client directly
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .upload('system/report.pdf', fileBuffer);
  
  return new Response(JSON.stringify({ data, error }));
});
```

## Testing from React Application

```typescript
// src/utils/adminStorage.ts
import { supabase } from '@/integrations/supabase/client';

/**
 * Call the storage admin operations Edge Function
 * Note: This still requires appropriate permissions on the Edge Function
 */
export async function adminStorageOperation(
  operation: 'upload' | 'delete' | 'list' | 'move',
  bucket: string,
  options: {
    path?: string;
    file?: string; // base64
    newPath?: string;
  }
) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-admin-operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        operation,
        bucket,
        ...options,
      }),
    }
  );
  
  return response.json();
}

// Usage example
async function uploadAdminFile(file: File) {
  const reader = new FileReader();
  
  reader.onloadend = async () => {
    const base64 = reader.result?.toString().split(',')[1];
    
    const result = await adminStorageOperation('upload', 'documents', {
      path: `admin/${file.name}`,
      file: base64,
    });
    
    console.log('Upload result:', result);
  };
  
  reader.readAsDataURL(file);
}
```

## Verifying RLS Bypass

To verify that the service key is indeed bypassing RLS:

1. **Create a restrictive RLS policy** that would normally block the operation
2. **Try the operation with a normal client** (should fail)
3. **Try the operation via the Edge Function** (should succeed)

Example:

```sql
-- In Supabase SQL Editor, create a very restrictive policy
CREATE POLICY "Block all uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (false); -- This blocks ALL uploads

-- Try uploading via normal client (will fail)
-- Try uploading via storage-admin-operations Edge Function (will succeed!)
```

## Monitoring and Logs

To monitor the Edge Function:

1. Go to Supabase Dashboard → Edge Functions
2. Select `storage-admin-operations`
3. Click on "Logs" tab
4. You'll see all invocations and console.log outputs

## Security Considerations

⚠️ **Important**: The storage-admin-operations function bypasses all RLS policies. In production:

1. Add authentication checks to verify caller identity
2. Implement authorization logic (who can do what)
3. Add audit logging for all operations
4. Consider rate limiting
5. Validate all inputs thoroughly

Example with authentication:

```typescript
Deno.serve(async (req) => {
  // Verify the caller is an admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createServiceRoleClient();
  
  // Verify the token and check user role
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
    });
  }
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
    });
  }
  
  // Proceed with operation...
});
```

## Troubleshooting

### "Function not found" error

- Verify the function is deployed: `npx supabase functions list`
- Check the function name matches: `storage-admin-operations`

### "Missing environment variables" error

- The service role key should be automatically available
- Check Supabase Dashboard → Settings → API to verify keys

### "Bucket not found" error

- Verify the bucket exists in Storage
- Check the bucket name is correct

### Upload still fails with RLS error

- Verify you're using the service role client, not anon client
- Check the Edge Function is using `createServiceRoleClient()`
- Review the function logs for detailed error messages

## Next Steps

1. Review [BYPASS_ACCESS_CONTROLS_GUIDE.md](./BYPASS_ACCESS_CONTROLS_GUIDE.md) for comprehensive security guidelines
2. Implement proper authentication and authorization
3. Add audit logging
4. Set up monitoring and alerts
5. Test thoroughly before deploying to production
