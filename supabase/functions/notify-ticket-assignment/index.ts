import { Resend } from "https://esm.sh/resend@2.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns HTML-safe string
 */
function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface NotificationRequest {
  assigneeEmail: string;
  assigneeName: string;
  ticketId: string;
  ticketTitle: string;
  ticketDescription: string;
  priority: string;
  branch?: string;
  faultType?: string;
  userEmail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      assigneeEmail,
      assigneeName,
      ticketId,
      ticketTitle,
      ticketDescription,
      priority,
      branch,
      faultType,
      userEmail,
    }: NotificationRequest = await req.json();

    // Validate required fields
    if (!assigneeEmail || !ticketId || !ticketTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: assigneeEmail, ticketId, and ticketTitle are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assigneeEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format for assigneeEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const priorityColors: Record<string, string> = {
      low: "#22c55e",
      medium: "#f59e0b",
      high: "#ef4444",
      urgent: "#dc2626",
    };

    // Sanitize priority to prevent injection
    const validPriorities = ["low", "medium", "high", "urgent"];
    const sanitizedPriority = validPriorities.includes(priority?.toLowerCase()) 
      ? priority.toLowerCase() 
      : "medium";

    const emailResponse = await resend.emails.send({
      from: "Oricol Helpdesk <onboarding@resend.dev>",
      to: [assigneeEmail],
      subject: `New Ticket Assigned: ${escapeHtml(ticketTitle)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <h1 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 24px;">New Ticket Assigned</h1>
              <p style="color: #666; margin: 0; font-size: 14px;">A new support ticket has been assigned to you</p>
            </div>

            <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: ${priorityColors[sanitizedPriority]}; color: white;">
                  ${escapeHtml(sanitizedPriority)} Priority
                </span>
              </div>

              <h2 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 20px;">${escapeHtml(ticketTitle)}</h2>
              <p style="color: #666; margin: 0 0 20px 0; white-space: pre-wrap;">${escapeHtml(ticketDescription)}</p>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
                ${branch ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #1a1a1a; font-size: 14px;">Branch:</strong>
                    <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(branch)}</span>
                  </div>
                ` : ""}
                
                ${faultType ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #1a1a1a; font-size: 14px;">Fault Type:</strong>
                    <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(faultType)}</span>
                  </div>
                ` : ""}

                ${userEmail ? `
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #1a1a1a; font-size: 14px;">Reported By:</strong>
                    <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(userEmail)}</span>
                  </div>
                ` : ""}

                <div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Ticket ID:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px; font-family: monospace;">${escapeHtml(ticketId.slice(0, 8))}</span>
                </div>
              </div>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;">
                <strong>Action Required:</strong> Please review and respond to this ticket as soon as possible.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Oricol Helpdesk System<br>
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in notify-ticket-assignment function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
