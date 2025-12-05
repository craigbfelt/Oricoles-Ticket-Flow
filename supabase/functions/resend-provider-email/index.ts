import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResendEmailRequest {
  emailLogId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { emailLogId }: ResendEmailRequest = await req.json();
    console.log("Resending email for log ID:", emailLogId);

    // Validate emailLogId is provided and is a valid UUID
    if (!emailLogId) {
      return new Response(
        JSON.stringify({ error: "Email log ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(emailLogId)) {
      return new Response(
        JSON.stringify({ error: "Invalid email log ID format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch email log
    const { data: emailLog, error: fetchError } = await supabase
      .from("provider_emails")
      .select("*")
      .eq("id", emailLogId)
      .single();

    if (fetchError || !emailLog) {
      throw new Error("Email log not found");
    }

    // Send email
    try {
      const emailResponse = await resend.emails.send({
        from: "Oricol Staff Management <onboarding@resend.dev>",
        to: emailLog.to_addresses,
        cc: emailLog.cc_addresses || [],
        subject: emailLog.subject,
        html: emailLog.html_content,
      });

      console.log("Email resent successfully:", emailResponse);

      // Update log status
      await supabase
        .from("provider_emails")
        .update({
          status: "resent",
          sent_at: new Date().toISOString(),
          resend_count: (emailLog.resend_count || 0) + 1,
          error_message: null
        })
        .eq("id", emailLogId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email resent successfully"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    } catch (sendError: any) {
      console.error("Failed to resend email:", sendError);
      
      // Update log with new error
      await supabase
        .from("provider_emails")
        .update({
          error_message: sendError.message || sendError.toString(),
          resend_count: (emailLog.resend_count || 0) + 1
        })
        .eq("id", emailLogId);
      
      throw sendError;
    }
  } catch (error: unknown) {
    console.error("Error in resend-provider-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to resend email';
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
