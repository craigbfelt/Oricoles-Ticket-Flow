/**
 * Centralized Upload Service with Debug Mode
 * 
 * This service provides a unified interface for all file uploads with:
 * - Comprehensive error handling and categorization
 * - Debug mode for detailed error tracking
 * - RLS policy validation
 * - Retry mechanisms
 * - User-friendly error messages
 */

import { supabase } from "@/integrations/supabase/client";

// Debug mode flag - can be toggled at runtime
let DEBUG_MODE = false;

export const setDebugMode = (enabled: boolean) => {
  DEBUG_MODE = enabled;
  if (enabled) {
    console.log('[UploadService] Debug mode enabled');
  }
};

export const isDebugMode = () => DEBUG_MODE;

// Error types for categorization
export enum UploadErrorType {
  RLS_POLICY = 'RLS_POLICY',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  UNKNOWN = 'UNKNOWN'
}

export interface UploadError {
  type: UploadErrorType;
  message: string;
  originalError?: any;
  details?: {
    bucket?: string;
    path?: string;
    table?: string;
    operation?: string;
    timestamp?: string;
    sessionInfo?: any;
    rlsContext?: any;
  };
  suggestion?: string;
}

export interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: UploadError;
  debugInfo?: any;
}

export interface DatabaseInsertOptions {
  table: string;
  data: Record<string, any>;
}

export interface DatabaseInsertResult {
  success: boolean;
  data?: any;
  error?: UploadError;
  debugInfo?: any;
}

/**
 * Categorize an error based on its message and code
 */
function categorizeError(error: any): UploadErrorType {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  
  if (errorMessage.includes('row level security') || 
      errorMessage.includes('rls') ||
      errorMessage.includes('policy') ||
      errorCode === '42501') {
    return UploadErrorType.RLS_POLICY;
  }
  
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
    return UploadErrorType.NETWORK;
  }
  
  if (errorMessage.includes('validation') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')) {
    return UploadErrorType.VALIDATION;
  }
  
  if (errorMessage.includes('storage') || 
      errorMessage.includes('bucket')) {
    return UploadErrorType.STORAGE;
  }
  
  if (errorMessage.includes('database') || 
      errorMessage.includes('table') ||
      errorMessage.includes('column')) {
    return UploadErrorType.DATABASE;
  }
  
  if (errorMessage.includes('auth') || 
      errorMessage.includes('session') ||
      errorMessage.includes('token')) {
    return UploadErrorType.AUTHENTICATION;
  }
  
  return UploadErrorType.UNKNOWN;
}

/**
 * Get a user-friendly error message based on error type
 */
function getUserFriendlyMessage(type: UploadErrorType, originalMessage: string): string {
  switch (type) {
    case UploadErrorType.RLS_POLICY:
      return 'Permission denied: You do not have access to perform this operation. This is a Row Level Security (RLS) policy restriction.';
    
    case UploadErrorType.NETWORK:
      return 'Network error: Please check your internet connection and try again.';
    
    case UploadErrorType.VALIDATION:
      return 'Validation error: The file or data provided is invalid.';
    
    case UploadErrorType.STORAGE:
      return 'Storage error: Failed to upload file to storage bucket.';
    
    case UploadErrorType.DATABASE:
      return 'Database error: Failed to save data to the database.';
    
    case UploadErrorType.AUTHENTICATION:
      return 'Authentication error: Please log in again and try.';
    
    default:
      return `Upload failed: ${originalMessage}`;
  }
}

/**
 * Get a helpful suggestion based on error type
 */
function getSuggestion(type: UploadErrorType, details?: any): string {
  switch (type) {
    case UploadErrorType.RLS_POLICY:
      return `RLS Policy Issue - Possible causes:
• The storage bucket "${details?.bucket || 'unknown'}" may not have proper INSERT policies
• You may not be authenticated or your session may have expired
• The bucket may not exist or be properly configured
• Check the Supabase dashboard for RLS policies on storage.objects for bucket: ${details?.bucket || 'unknown'}`;
    
    case UploadErrorType.NETWORK:
      return 'Try checking your internet connection and refreshing the page.';
    
    case UploadErrorType.VALIDATION:
      return 'Ensure the file type and size are acceptable.';
    
    case UploadErrorType.STORAGE:
      return 'The storage bucket may not exist or may not be properly configured. Check Supabase storage settings.';
    
    case UploadErrorType.DATABASE:
      return `Database Issue - Possible causes:
• The table "${details?.table || 'unknown'}" may not have proper INSERT policies
• Required fields may be missing
• Check the Supabase dashboard for RLS policies on table: ${details?.table || 'unknown'}`;
    
    case UploadErrorType.AUTHENTICATION:
      return 'Please log out and log back in, then try again.';
    
    default:
      return 'Please try again or contact support if the issue persists.';
  }
}

/**
 * Get current session information for debugging
 */
async function getSessionDebugInfo() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { error: error.message };
    }
    
    if (!session) {
      return { authenticated: false };
    }
    
    return {
      authenticated: true,
      userId: session.user.id,
      userEmail: session.user.email,
      expiresAt: session.expires_at,
      role: session.user.role
    };
  } catch (error) {
    return { error: 'Failed to get session info' };
  }
}

/**
 * Check if a storage bucket exists and is accessible
 */
async function checkBucketAccess(bucketName: string): Promise<any> {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    
    if (error) {
      return { accessible: false, error: error.message };
    }
    
    return {
      accessible: true,
      public: data.public,
      id: data.id,
      name: data.name
    };
  } catch (error: any) {
    return { accessible: false, error: error.message };
  }
}

/**
 * Upload a file to Supabase storage with comprehensive error handling
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param file - The file to upload (File or Blob)
 * @param options - Upload options
 * @returns Upload result with success status and error details
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const startTime = Date.now();
  
  if (DEBUG_MODE) {
    console.group(`[UploadService] Starting upload`);
    console.log('Bucket:', bucket);
    console.log('Path:', path);
    console.log('File:', file);
    console.log('Options:', options);
  }
  
  try {
    // Step 1: Validate inputs
    if (!bucket || !path || !file) {
      const error: UploadError = {
        type: UploadErrorType.VALIDATION,
        message: 'Missing required parameters',
        details: { bucket, path, timestamp: new Date().toISOString() },
        suggestion: 'Ensure bucket, path, and file are provided'
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Validation error:', error);
        console.groupEnd();
      }
      
      return { success: false, error };
    }
    
    // Step 2: Get session info for debugging
    const sessionInfo = await getSessionDebugInfo();
    
    if (DEBUG_MODE) {
      console.log('[UploadService] Session info:', sessionInfo);
    }
    
    if (!sessionInfo.authenticated) {
      const error: UploadError = {
        type: UploadErrorType.AUTHENTICATION,
        message: 'User is not authenticated',
        details: { 
          bucket, 
          path, 
          timestamp: new Date().toISOString(),
          sessionInfo 
        },
        suggestion: getSuggestion(UploadErrorType.AUTHENTICATION)
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Authentication error:', error);
        console.groupEnd();
      }
      
      return { success: false, error };
    }
    
    // Step 3: Check bucket access
    const bucketInfo = await checkBucketAccess(bucket);
    
    if (DEBUG_MODE) {
      console.log('[UploadService] Bucket info:', bucketInfo);
    }
    
    if (!bucketInfo.accessible) {
      const error: UploadError = {
        type: UploadErrorType.STORAGE,
        message: `Bucket '${bucket}' is not accessible`,
        details: { 
          bucket, 
          path, 
          timestamp: new Date().toISOString(),
          sessionInfo,
          bucketInfo
        },
        suggestion: `The bucket '${bucket}' may not exist or you may not have access. Check Supabase Storage settings.`
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Bucket access error:', error);
        console.groupEnd();
      }
      
      return { success: false, error };
    }
    
    // Step 4: Attempt upload
    if (DEBUG_MODE) {
      console.log('[UploadService] Attempting upload...');
    }
    
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options.upsert ?? false,
        contentType: options.contentType,
        cacheControl: options.cacheControl
      });
    
    if (uploadError) {
      const errorType = categorizeError(uploadError);
      const error: UploadError = {
        type: errorType,
        message: getUserFriendlyMessage(errorType, uploadError.message),
        originalError: uploadError,
        details: {
          bucket,
          path,
          operation: 'upload',
          timestamp: new Date().toISOString(),
          sessionInfo,
          bucketInfo,
          rlsContext: errorType === UploadErrorType.RLS_POLICY ? {
            message: 'RLS policy violation detected',
            requiredPolicies: [
              `INSERT policy on storage.objects for bucket '${bucket}'`,
              'User must be authenticated'
            ],
            troubleshooting: [
              '1. Check if bucket exists in Supabase Storage',
              `2. Verify RLS policies on storage.objects allow INSERT for bucket '${bucket}'`,
              '3. Ensure you are logged in with a valid session',
              '4. Check if bucket is public or has proper policies'
            ]
          } : undefined
        },
        suggestion: getSuggestion(errorType, { bucket, path })
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Upload failed:', error);
        console.error('[UploadService] Original error:', uploadError);
        console.groupEnd();
      }
      
      return { 
        success: false, 
        error,
        debugInfo: DEBUG_MODE ? {
          sessionInfo,
          bucketInfo,
          errorDetails: uploadError,
          duration: Date.now() - startTime
        } : undefined
      };
    }
    
    const duration = Date.now() - startTime;
    
    if (DEBUG_MODE) {
      console.log('[UploadService] Upload successful:', data);
      console.log('[UploadService] Duration:', duration, 'ms');
      console.groupEnd();
    }
    
    return {
      success: true,
      path: data.path,
      debugInfo: DEBUG_MODE ? {
        sessionInfo,
        bucketInfo,
        uploadData: data,
        duration
      } : undefined
    };
    
  } catch (error: any) {
    const errorType = categorizeError(error);
    const uploadError: UploadError = {
      type: errorType,
      message: getUserFriendlyMessage(errorType, error.message || 'Unknown error'),
      originalError: error,
      details: {
        bucket,
        path,
        operation: 'upload',
        timestamp: new Date().toISOString()
      },
      suggestion: getSuggestion(errorType, { bucket, path })
    };
    
    if (DEBUG_MODE) {
      console.error('[UploadService] Unexpected error:', uploadError);
      console.error('[UploadService] Stack trace:', error);
      console.groupEnd();
    }
    
    return { success: false, error: uploadError };
  }
}

/**
 * Insert data into a database table with comprehensive error handling
 * 
 * @param options - Database insert options
 * @returns Insert result with success status and error details
 */
export async function insertDatabaseRecord(
  options: DatabaseInsertOptions
): Promise<DatabaseInsertResult> {
  const startTime = Date.now();
  
  if (DEBUG_MODE) {
    console.group(`[UploadService] Database insert`);
    console.log('Table:', options.table);
    console.log('Data:', options.data);
  }
  
  try {
    // Step 1: Validate inputs
    if (!options.table || !options.data) {
      const error: UploadError = {
        type: UploadErrorType.VALIDATION,
        message: 'Missing required parameters for database insert',
        details: { 
          table: options.table, 
          timestamp: new Date().toISOString() 
        },
        suggestion: 'Ensure table and data are provided'
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Validation error:', error);
        console.groupEnd();
      }
      
      return { success: false, error };
    }
    
    // Step 2: Get session info
    const sessionInfo = await getSessionDebugInfo();
    
    if (DEBUG_MODE) {
      console.log('[UploadService] Session info:', sessionInfo);
    }
    
    if (!sessionInfo.authenticated) {
      const error: UploadError = {
        type: UploadErrorType.AUTHENTICATION,
        message: 'User is not authenticated',
        details: { 
          table: options.table,
          timestamp: new Date().toISOString(),
          sessionInfo 
        },
        suggestion: getSuggestion(UploadErrorType.AUTHENTICATION)
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Authentication error:', error);
        console.groupEnd();
      }
      
      return { success: false, error };
    }
    
    // Step 3: Attempt insert
    if (DEBUG_MODE) {
      console.log('[UploadService] Attempting database insert...');
    }
    
    const { data, error: dbError } = await (supabase as any)
      .from(options.table)
      .insert(options.data)
      .select();
    
    if (dbError) {
      const errorType = categorizeError(dbError);
      const error: UploadError = {
        type: errorType,
        message: getUserFriendlyMessage(errorType, dbError.message),
        originalError: dbError,
        details: {
          table: options.table,
          operation: 'insert',
          timestamp: new Date().toISOString(),
          sessionInfo,
          rlsContext: errorType === UploadErrorType.RLS_POLICY ? {
            message: 'RLS policy violation detected',
            requiredPolicies: [
              `INSERT policy on table '${options.table}'`,
              'User must be authenticated'
            ],
            troubleshooting: [
              '1. Check if table exists in Supabase',
              `2. Verify RLS policies on table '${options.table}' allow INSERT`,
              '3. Ensure you are logged in with a valid session',
              '4. Check if all required fields are provided'
            ]
          } : undefined
        },
        suggestion: getSuggestion(errorType, { table: options.table })
      };
      
      if (DEBUG_MODE) {
        console.error('[UploadService] Database insert failed:', error);
        console.error('[UploadService] Original error:', dbError);
        console.groupEnd();
      }
      
      return { 
        success: false, 
        error,
        debugInfo: DEBUG_MODE ? {
          sessionInfo,
          errorDetails: dbError,
          duration: Date.now() - startTime
        } : undefined
      };
    }
    
    const duration = Date.now() - startTime;
    
    if (DEBUG_MODE) {
      console.log('[UploadService] Database insert successful:', data);
      console.log('[UploadService] Duration:', duration, 'ms');
      console.groupEnd();
    }
    
    return {
      success: true,
      data,
      debugInfo: DEBUG_MODE ? {
        sessionInfo,
        insertData: data,
        duration
      } : undefined
    };
    
  } catch (error: any) {
    const errorType = categorizeError(error);
    const dbError: UploadError = {
      type: errorType,
      message: getUserFriendlyMessage(errorType, error.message || 'Unknown error'),
      originalError: error,
      details: {
        table: options.table,
        operation: 'insert',
        timestamp: new Date().toISOString()
      },
      suggestion: getSuggestion(errorType, { table: options.table })
    };
    
    if (DEBUG_MODE) {
      console.error('[UploadService] Unexpected error:', dbError);
      console.error('[UploadService] Stack trace:', error);
      console.groupEnd();
    }
    
    return { success: false, error: dbError };
  }
}

/**
 * Combined upload: Upload file to storage AND insert metadata to database
 * This is a common pattern for document/image uploads
 */
export async function uploadFileWithMetadata(
  bucket: string,
  path: string,
  file: File | Blob,
  databaseOptions: DatabaseInsertOptions,
  uploadOptions: UploadOptions = {}
): Promise<{ 
  success: boolean; 
  uploadResult?: UploadResult; 
  dbResult?: DatabaseInsertResult;
  error?: UploadError;
}> {
  if (DEBUG_MODE) {
    console.group('[UploadService] Combined upload (file + metadata)');
  }
  
  // Step 1: Upload file to storage
  const uploadResult = await uploadFile(bucket, path, file, uploadOptions);
  
  if (!uploadResult.success) {
    if (DEBUG_MODE) {
      console.error('[UploadService] File upload failed, skipping database insert');
      console.groupEnd();
    }
    return { success: false, uploadResult, error: uploadResult.error };
  }
  
  // Step 2: Insert metadata to database
  const dbResult = await insertDatabaseRecord(databaseOptions);
  
  if (!dbResult.success) {
    if (DEBUG_MODE) {
      console.warn('[UploadService] Database insert failed, but file was uploaded');
      console.groupEnd();
    }
    return { success: false, uploadResult, dbResult, error: dbResult.error };
  }
  
  if (DEBUG_MODE) {
    console.log('[UploadService] Combined upload successful');
    console.groupEnd();
  }
  
  return { success: true, uploadResult, dbResult };
}
