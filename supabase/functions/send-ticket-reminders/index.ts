import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@2.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get open tickets that haven't been updated in 24 hours and haven't had a reminder sent recently
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        title,
        description,
        priority,
        branch,
        fault_type,
        user_email,
        created_at,
        last_activity_at,
        reminder_sent_at,
        assigned_to,
        profiles:assigned_to (
          email,
          full_name
        )
      `)
      .in("status", ["open", "in_progress", "pending"])
      .or(`last_activity_at.lt.${twentyFourHoursAgo},last_activity_at.is.null`)
      .or(`reminder_sent_at.lt.${twentyFourHoursAgo},reminder_sent_at.is.null`)
      .not("assigned_to", "is", null);

    if (ticketsError) {
      throw ticketsError;
    }

    const remindersSent = [];
    const errors = [];

    for (const ticket of tickets || []) {
      try {
        const assignee = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
        
        if (!assignee?.email) {
          errors.push(`Ticket ${ticket.id}: No assignee email found`);
          continue;
        }

        const hoursSinceActivity = ticket.last_activity_at
          ? Math.floor((Date.now() - new Date(ticket.last_activity_at).getTime()) / (1000 * 60 * 60))
          : Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60));

        await resend.emails.send({
          from: "Oricol Helpdesk <onboarding@resend.dev>",
          to: [assignee.email],
          subject: `Reminder: Open Ticket - ${ticket.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
                  <h1 style="color: #92400e; margin: 0 0 8px 0; font-size: 24px;">⏰ Ticket Reminder</h1>
                  <p style="color: #78350f; margin: 0; font-size: 14px;">This ticket needs your attention</p>
                </div>

                <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
                  <h2 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 20px;">${ticket.title}</h2>
                  <p style="color: #666; margin: 0 0 20px 0; white-space: pre-wrap;">${ticket.description}</p>

                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b;">
                      <strong>Last activity:</strong> ${hoursSinceActivity} hours ago
                    </p>
                  </div>

                  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
                    ${ticket.branch ? `
                      <div style="margin-bottom: 12px;">
                        <strong style="color: #1a1a1a; font-size: 14px;">Branch:</strong>
                        <span style="color: #666; font-size: 14px; margin-left: 8px;">${ticket.branch}</span>
                      </div>
                    ` : ""}
                    
                    ${ticket.fault_type ? `
                      <div style="margin-bottom: 12px;">
                        <strong style="color: #1a1a1a; font-size: 14px;">Fault Type:</strong>
                        <span style="color: #666; font-size: 14px; margin-left: 8px;">${ticket.fault_type}</span>
                      </div>
                    ` : ""}

                    <div style="margin-bottom: 12px;">
                      <strong style="color: #1a1a1a; font-size: 14px;">Priority:</strong>
                      <span style="color: #666; font-size: 14px; margin-left: 8px; text-transform: uppercase;">${ticket.priority}</span>
                    </div>

                    <div style="margin-bottom: 12px;">
                      <strong style="color: #1a1a1a; font-size: 14px;">Ticket ID:</strong>
                      <span style="color: #666; font-size: 14px; margin-left: 8px; font-family: monospace;">${ticket.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Oricol Helpdesk System<br>
                    This is an automated reminder. Please do not reply to this email.
                  </p>
                </div>
              </body>
            </html>
          `,
        });

        // Update reminder_sent_at
        await supabase
          .from("tickets")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", ticket.id);

        remindersSent.push(ticket.id);
      } catch (error: unknown) {
        console.error(`Error sending reminder for ticket ${ticket.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Ticket ${ticket.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: remindersSent.length,
        errors: errors.length > 0 ? errors : undefined,
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
    console.error("Error in send-ticket-reminders function:", error);
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
