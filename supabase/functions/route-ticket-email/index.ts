import { Resend } from "https://esm.sh/resend@4.0.0";

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

interface TicketEmailRequest {
  ticketId: string;
  ticketCode?: string;
  title: string;
  description: string;
  faultType: string;
  branch: string;
  userEmail: string;
  errorCode?: string;
  priority: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, ticketCode, title, description, faultType, branch, userEmail, errorCode, priority }: TicketEmailRequest = await req.json();

    console.log("Processing ticket email routing:", { ticketId, ticketCode, faultType, branch });
    
    // Required recipients for all tickets
    const requiredRecipients = [
      "craig@zerobitone.co.za",
      "Jerusha.naidoo@oricoles.co.za",
      "graeme.smart@oricoles.co.za"
    ];

    // Send notification to required recipients (craig, Jerusha, Graeme)
    const adminEmailResponse = await resend.emails.send({
      from: "Oricol Helpdesk <onboarding@resend.dev>",
      to: requiredRecipients,
      subject: `[${escapeHtml(ticketCode || ticketId.slice(0, 8))}] ${escapeHtml(title)} - ${escapeHtml(branch)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <h1 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 24px;">New Support Ticket</h1>
              <p style="color: #666; margin: 0; font-size: 14px;">A new support ticket has been created</p>
            </div>

            <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: ${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e'}; color: white;">
                  ${escapeHtml(priority?.toUpperCase() || 'MEDIUM')} Priority
                </span>
                ${ticketCode ? `<span style="display: inline-block; margin-left: 8px; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: #e5e7eb; color: #1a1a1a;">
                  ${escapeHtml(ticketCode)}
                </span>` : ''}
              </div>

              <h2 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 20px;">${escapeHtml(title)}</h2>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
                <div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Branch:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(branch)}</span>
                </div>
                
                <div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Fault Type:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(faultType)}</span>
                </div>

                <div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Reported By:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px;">${escapeHtml(userEmail)}</span>
                </div>

                ${errorCode ? `<div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Error Code:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px; font-family: monospace;">${escapeHtml(errorCode)}</span>
                </div>` : ''}

                <div style="margin-bottom: 12px;">
                  <strong style="color: #1a1a1a; font-size: 14px;">Ticket ID:</strong>
                  <span style="color: #666; font-size: 14px; margin-left: 8px; font-family: monospace;">${escapeHtml(ticketId.slice(0, 8))}</span>
                </div>
              </div>

              <div style="margin-top: 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                <h3 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 14px;">Description:</h3>
                <p style="color: #666; margin: 0; white-space: pre-wrap;">${escapeHtml(description) || 'No description provided'}</p>
              </div>
            </div>

            ${faultType === 'RDP' ? `<div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Note:</strong> This RDP ticket has also been routed to Qwerti (support@qwerti.co.za)
              </p>
            </div>` : ''}

            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Oricol Helpdesk System<br>
                This is an automated notification
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Notification sent to admin team:", adminEmailResponse);

    // Route to Qwerti for RDP issues
    if (faultType === "RDP") {
      const rdpEmailResponse = await resend.emails.send({
        from: "Oricol Helpdesk <onboarding@resend.dev>",
        to: ["support@qwerti.co.za"],
        subject: `[RDP ${escapeHtml(ticketCode || ticketId.slice(0, 8))}] ${escapeHtml(title)} - ${escapeHtml(branch)}`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a;">New RDP Support Ticket</h2>
              ${ticketCode ? `<p><strong>Ticket Code:</strong> ${escapeHtml(ticketCode)}</p>` : ''}
              <p><strong>Ticket ID:</strong> ${escapeHtml(ticketId)}</p>
              <p><strong>Branch:</strong> ${escapeHtml(branch)}</p>
              <p><strong>User Email:</strong> ${escapeHtml(userEmail)}</p>
              <p><strong>Priority:</strong> ${escapeHtml(priority?.toUpperCase() || 'MEDIUM')}</p>
              <p><strong>Fault Type:</strong> ${escapeHtml(faultType)}</p>
              ${errorCode ? `<p><strong>Error Code:</strong> ${escapeHtml(errorCode)}</p>` : ''}
              <h3>Description:</h3>
              <p style="white-space: pre-wrap;">${escapeHtml(description) || 'No description provided'}</p>
              <hr>
              <p><em>This ticket was automatically routed from Oricol Helpdesk</em></p>
            </body>
          </html>
        `,
      });

      console.log("RDP Email sent to Qwerti:", rdpEmailResponse);
    }

    // Send confirmation to user
    const confirmationResponse = await resend.emails.send({
      from: "Oricol Helpdesk <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Ticket Created: ${ticketCode || ticketId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0 0 8px 0;">Your Support Ticket Has Been Created</h2>
              <p style="color: #666; margin: 0;">Thank you for submitting your support request.</p>
            </div>

            <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
              ${ticketCode ? `<p style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0;">
                Ticket Code: ${escapeHtml(ticketCode)}
              </p>` : ''}
              <p><strong>Branch:</strong> ${escapeHtml(branch)}</p>
              <p><strong>Fault Type:</strong> ${escapeHtml(faultType)}</p>
              <p><strong>Priority:</strong> ${escapeHtml(priority?.toUpperCase() || 'MEDIUM')}</p>
              ${faultType === "RDP" ? '<p style="color: #0369a1;"><em>This ticket has been routed to Qwerti for RDP support.</em></p>' : ''}
              
              <div style="margin-top: 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                <h3 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 14px;">Description:</h3>
                <p style="color: #666; margin: 0; white-space: pre-wrap;">${escapeHtml(description) || 'No description provided'}</p>
              </div>
            </div>

            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #0369a1;">
                <strong>Response Time:</strong> We aim to respond within 15 minutes.<br>
                ${priority === 'urgent' ? '<strong>Resolution Time:</strong> Urgent tickets are prioritized for resolution within 2 hours.<br>' : ''}
                We will update you as soon as possible.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Oricol Helpdesk - Centralised IT Management<br>
                This is an automated notification
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Confirmation email sent to user:", confirmationResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in route-ticket-email function:", error);
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
