import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ImportRequest {
  staff_user_ids: string[];
}

interface ImportResult {
  success: boolean;
  email?: string;
  username?: string;
  password?: string;
  error?: string;
  message?: string;
}

// Generate a random password
function generateRandomPassword(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  const crypto = globalThis.crypto;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("import-staff-users: Handler invoked", { method: req.method });
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("import-staff-users: Missing environment variables");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Server configuration error - missing required environment variables. Please contact your administrator." 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error("import-staff-users: Invalid JSON in request body", jsonError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid request format - request body must be valid JSON" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { staff_user_ids }: ImportRequest = requestBody;

    if (!staff_user_ids || !Array.isArray(staff_user_ids) || staff_user_ids.length === 0) {
      console.error("import-staff-users: Invalid staff_user_ids", { staff_user_ids });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid request - staff_user_ids must be a non-empty array of user IDs" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`import-staff-users: Processing ${staff_user_ids.length} staff user(s)`);

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each staff user
    for (const staffUserId of staff_user_ids) {
      try {
        // Get staff user details
        const { data: staffUser, error: fetchError } = await supabaseAdmin
          .from("vpn_rdp_credentials")
          .select("id, username, email, service_type, notes")
          .eq("id", staffUserId)
          .single();

        if (fetchError || !staffUser) {
          console.error(`import-staff-users: Staff user ${staffUserId} not found`, fetchError);
          results.push({
            success: false,
            error: `Staff user with ID ${staffUserId} not found in database`,
          });
          errorCount++;
          continue;
        }

        if (!staffUser.email) {
          console.warn(`import-staff-users: Staff user ${staffUser.username} has no email`);
          results.push({
            success: false,
            username: staffUser.username,
            error: "Staff user has no email address - email is required for system login",
          });
          errorCount++;
          continue;
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.some(
          (u) => u.email?.toLowerCase() === staffUser.email.toLowerCase()
        );

        if (userExists) {
          console.warn(`import-staff-users: User already exists with email ${staffUser.email}`);
          results.push({
            success: false,
            email: staffUser.email,
            username: staffUser.username,
            error: "A user account already exists with this email address",
          });
          errorCount++;
          continue;
        }

        // Generate random password
        const password = generateRandomPassword(16);

        // Create the user using Supabase Admin API
        console.log(`import-staff-users: Creating user account for ${staffUser.email}`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: staffUser.email,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: staffUser.username,
            username: staffUser.username,
            imported_from_staff: true,
            original_staff_id: staffUser.id,
          },
        });

        if (createError || !newUser) {
          console.error(`import-staff-users: Failed to create user ${staffUser.email}`, createError);
          results.push({
            success: false,
            email: staffUser.email,
            username: staffUser.username,
            error: `Failed to create user account: ${createError?.message || "Unknown error"}`,
          });
          errorCount++;
          continue;
        }

        console.log(`import-staff-users: User created successfully ${staffUser.email}, updating profile`);
        
        // Update the profile with additional information
        // Note: The handle_new_user trigger creates the profile automatically,
        // we're updating it to ensure full_name is set correctly
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: staffUser.username,
          })
          .eq("user_id", newUser.user.id);

        if (profileError) {
          console.error(`import-staff-users: Failed to update profile for ${staffUser.email}`, profileError);
          // Don't fail the whole import if profile update fails
        }

        console.log(`import-staff-users: Successfully imported user ${staffUser.email}`);
        results.push({
          success: true,
          email: staffUser.email,
          username: staffUser.username,
          password: password,
          message: "User created successfully",
        });
        successCount++;
      } catch (error) {
        console.error(`import-staff-users: Error processing staff user ${staffUserId}:`, error);
        results.push({
          success: false,
          error: `Failed to process user: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        errorCount++;
      }
    }

    console.log(`import-staff-users: Import completed. Success: ${successCount}, Errors: ${errorCount}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        total: staff_user_ids.length,
        success_count: successCount,
        error_count: errorCount,
        results: results,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("import-staff-users: Unexpected error in handler:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}. Please contact your administrator.`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
