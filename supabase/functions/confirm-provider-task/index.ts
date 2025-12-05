import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConfirmEmailRequest {
  token: string;
  providerName?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, providerName, notes }: ConfirmEmailRequest = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Confirmation token is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate token format and length
    if (typeof token !== 'string' || token.length < 10 || token.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation token format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Sanitize optional string inputs
    const sanitizedProviderName = providerName?.trim().substring(0, 255);
    const sanitizedNotes = notes?.trim().substring(0, 1000);

    console.log("Processing confirmation for token:", token);

    // Find the email log by token
    const { data: emailLog, error: fetchError } = await supabase
      .from("provider_emails")
      .select("*")
      .eq("confirmation_token", token)
      .single();

    if (fetchError || !emailLog) {
      console.error("Email log not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid confirmation token" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if already confirmed
    if (emailLog.confirmed_at) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "This task was already confirmed",
          alreadyConfirmed: true,
          confirmedAt: emailLog.confirmed_at,
          confirmedBy: emailLog.confirmed_by
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update confirmation status
    const { error: updateError } = await supabase
      .from("provider_emails")
      .update({
        confirmed_at: new Date().toISOString(),
        confirmed_by: sanitizedProviderName || emailLog.provider,
        provider_notes: sanitizedNotes,
      })
      .eq("id", emailLog.id);

    if (updateError) {
      console.error("Failed to update confirmation:", updateError);
      throw updateError;
    }

    console.log("Email confirmed successfully:", emailLog.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Task confirmed successfully",
        staffMemberName: emailLog.staff_member_name,
        emailType: emailLog.email_type
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in confirm-provider-task function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to confirm task';
    const errorDetails = error instanceof Error ? error.toString() : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

Deno.serve(handler);
