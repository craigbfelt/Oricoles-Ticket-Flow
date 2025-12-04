import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

interface StaffOnboardingRequest {
  // Basic Info
  displayName: string;
  email: string;
  password: string;
  cellPhone?: string;
  location?: string;
  jobTitle?: string;
  department?: string;
  
  // Replacement Info
  isReplacement: boolean;
  oldUserName?: string;
  oldUserEmail?: string;
  deleteOldProfile?: boolean;
  createEmailAlias?: boolean;
  aliasForwardTo?: string;
  
  // Access Rights
  copyAccessFrom?: string;
  folderAccess?: string;
  emailDistributions?: string;
  printerAccess?: string;
  requireMfa?: boolean;
  
  // Licenses
  needsRdp?: boolean;
  needsVpn?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: StaffOnboardingRequest = await req.json();
    console.log("Processing staff onboarding email request for:", requestData.displayName);

    const {
      displayName,
      email,
      password,
      cellPhone,
      location,
      jobTitle,
      department,
      isReplacement,
      oldUserName,
      oldUserEmail,
      deleteOldProfile,
      createEmailAlias,
      aliasForwardTo,
      copyAccessFrom,
      folderAccess,
      emailDistributions,
      printerAccess,
      requireMfa,
      needsRdp,
      needsVpn,
    } = requestData;

    const usernamePart = displayName.replace(/\s+/g, '.');
    const firstName = displayName.split(' ')[0];
    const currentDate = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    // Generate unique confirmation token
    const { data: tokenData } = await supabase.rpc('generate_confirmation_token');
    const confirmationToken = tokenData || crypto.randomUUID();
    const confirmationUrl = `${supabaseUrl.replace('/rest/v1', '')}/functions/v1/confirm-provider-task?token=${confirmationToken}`;
    
    // Use WEB_APP_URL environment variable for the deployed web app URL
    // Set WEB_APP_URL in Supabase Dashboard → Edge Functions → Environment Variables
    const webAppUrl = Deno.env.get("WEB_APP_URL") || 'https://oricol-ticket-flow-ten.vercel.app';
    const webConfirmUrl = `${webAppUrl}/provider-confirm?token=${confirmationToken}`;

    // Generate Qwerti email content
    const qwertiEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <p><strong>From:</strong> Graeme Smart &lt;Graeme.Smart@oricoles.co.za&gt;<br>
        <strong>To:</strong> Qwerti Managed Services &lt;support@qwerti.co.za&gt;; Shaun Chetty &lt;shaun.chetty@qwerti.co.za&gt;<br>
        <strong>cc:</strong> Jerusha Naidoo &lt;Jerusha.Naidoo@oricoles.co.za&gt;; Craig Felt &lt;craig@zerobitone.co.za&gt;; Andrew Fernandes &lt;Andrew.Fernandes@oricoles.co.za&gt;; Peter Allen &lt;Peter.Allen@oricoles.co.za&gt;; Muhammed Rassool &lt;Muhammed.Rassool@Oricoles.co.za&gt;</p>
        
        <p>Hello Support / Shaun,</p>
        
        ${isReplacement ? `
          <p>In brief, ${oldUserName} was a staff member${location ? ` in ${location}` : ''}, and has left Oricol.<br>
          I would now like to use their RDP and O365 license for ${displayName} who is our ${jobTitle}${location ? ` – ${location}` : ''}.<br>
          Can we make these changes today, ${currentDate}.</p>
        ` : `
          <p>We have a new staff member joining: ${displayName} who is our ${jobTitle}${location ? ` in ${location}` : ''}.</p>
        `}
        
        <p>Please ${isReplacement ? `move forward to act as follows on our active directory and effectively reallocate the license${oldUserName ? ` of ${oldUserName}` : ''} to ${displayName}` : 'act as follows on our active directory'}:</p>
        
        <p><strong>NEW USER SETUP:</strong></p>
        <ol>
          <li>New user is ${usernamePart}</li>
          <li>Email is ${email}</li>
          <li>Password to be issued is ${password}</li>
          ${copyAccessFrom ? `<li>In terms of access rights/privileges, please can ${firstName}'s profile be set up with the same rights as ${copyAccessFrom}${folderAccess ? `, so that they can access ${folderAccess}` : ''}.</li>` : folderAccess ? `<li>Folder access required: ${folderAccess}</li>` : ''}
          ${emailDistributions ? `<li>Email distribution: Please place ${firstName} on ${emailDistributions}</li>` : ''}
          ${printerAccess ? `<li>${printerAccess}</li>` : ''}
          ${requireMfa && cellPhone ? `<li>Multi Factor Authentication will need to be set up too for ${firstName} – ${firstName} is with us (cell ${cellPhone}) and Jerusha can work with you to get this set up for ${firstName}</li>` : ''}
        </ol>
        
        ${isReplacement && oldUserName ? `
          <p><strong>OLD PROFILE: ${oldUserName}</strong></p>
          <ol>
            <li>${deleteOldProfile ? 'The profile can be deleted.' : 'Please disable the profile.'}</li>
            ${createEmailAlias && aliasForwardTo ? `<li>Please can we add ${oldUserEmail} as an ALIAS to ${aliasForwardTo} (email forward already in place, plus a PST is done and in place of the old emails of ${oldUserName.split(' ')[0]} under ${aliasForwardTo})</li>` : ''}
          </ol>
        ` : ''}
        
        <p>If I have missed anything, please feel free to reach out to me or Jerusha and we can resolve very promptly.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">✓ Confirm Task Completion</p>
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #334155;">
            Once you've completed the setup for ${displayName}, please click the button below to confirm:
          </p>
          <a href="${webConfirmUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Confirm Setup Complete
          </a>
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #64748b;">
            This helps us track task completion and keep our records up to date.
          </p>
        </div>
        
        <p>Kind regards<br>
        Graeme Smart</p>
      </div>
    `;

    const sentEmails: string[] = [];

    // Log email to database before sending
    const emailLog = await supabase
      .from("provider_emails")
      .insert({
        email_type: "staff_onboarding",
        provider: "qwerti",
        subject: `${isReplacement ? 'License Migration' : 'New Staff Member'}: ${displayName} - ${jobTitle}`,
        to_addresses: ["support@qwerti.co.za", "shaun.chetty@qwerti.co.za"],
        cc_addresses: [
          "Jerusha.Naidoo@oricoles.co.za",
          "craig@zerobitone.co.za",
          "Andrew.Fernandes@oricoles.co.za",
          "Peter.Allen@oricoles.co.za",
          "Muhammed.Rassool@Oricoles.co.za"
        ],
        html_content: qwertiEmailHtml,
        staff_member_name: displayName,
        staff_member_email: email,
        request_data: requestData,
        confirmation_token: confirmationToken,
        status: "pending"
      })
      .select()
      .single();

    if (emailLog.error) {
      console.error("Failed to log email:", emailLog.error);
    }

    // Send email to Qwerti
    try {
      const qwertiResponse = await resend.emails.send({
        from: "Oricol Staff Management <onboarding@resend.dev>",
        to: ["support@qwerti.co.za", "shaun.chetty@qwerti.co.za"],
        cc: [
          "Jerusha.Naidoo@oricoles.co.za",
          "craig@zerobitone.co.za",
          "Andrew.Fernandes@oricoles.co.za",
          "Peter.Allen@oricoles.co.za",
          "Muhammed.Rassool@Oricoles.co.za"
        ],
        subject: `${isReplacement ? 'License Migration' : 'New Staff Member'}: ${displayName} - ${jobTitle}`,
        html: qwertiEmailHtml,
      });

      console.log("Qwerti email sent successfully:", qwertiResponse);

      // Update log status to sent
      if (emailLog.data) {
        await supabase
          .from("provider_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", emailLog.data.id);
      }

      sentEmails.push("Qwerti/Nymbis");
    } catch (error: any) {
      console.error("Failed to send Qwerti email:", error);
      
      // Update log status to failed
      if (emailLog.data) {
        await supabase
          .from("provider_emails")
          .update({
            status: "failed",
            error_message: error.message || error.toString()
          })
          .eq("id", emailLog.data.id);
      }
      
      throw error;
    }

    // Send notification about VPN if needed
    if (needsVpn) {
      // Generate unique confirmation token for Armata
      const { data: armataTokenData } = await supabase.rpc('generate_confirmation_token');
      const armataConfirmationToken = armataTokenData || crypto.randomUUID();
      
      // Use WEB_APP_URL environment variable for the deployed web app URL
      // Set WEB_APP_URL in Supabase Dashboard → Edge Functions → Environment Variables
      const webAppUrl = Deno.env.get("WEB_APP_URL") || 'https://oricol-ticket-flow-ten.vercel.app';
      const armataWebConfirmUrl = `${webAppUrl}/provider-confirm?token=${armataConfirmationToken}`;

      const vpnEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <p><strong>From:</strong> Graeme Smart &lt;Graeme.Smart@oricoles.co.za&gt;<br>
          <strong>To:</strong> Armata Support &lt;support@armata.co.za&gt;</p>
          
          <p>Hi Armata Support,</p>
          
          <p>Please can you add ${isReplacement ? 'a replacement' : 'a new'} user today to FortiClient?</p>
          
          <p>Login and password we seek are shown below:</p>
          
          <table style="border-collapse: collapse; margin: 20px 0; width: 100%; max-width: 600px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Suggested Login User Name</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Name</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Surname</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Password</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px;">${usernamePart}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${firstName}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${displayName.split(' ').slice(1).join(' ')}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${password}</td>
              </tr>
            </tbody>
          </table>
          
          ${isReplacement && oldUserName ? `
            <p><strong>Note:</strong> This replaces the VPN profile for ${oldUserName} (${oldUserEmail}) who has left Oricol.</p>
          ` : ''}
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">✓ Confirm Task Completion</p>
            <p style="margin: 0 0 15px 0; font-size: 14px; color: #334155;">
              Once you've completed the VPN setup for ${displayName}, please click the button below to confirm:
            </p>
            <a href="${armataWebConfirmUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Confirm Setup Complete
            </a>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #64748b;">
              This helps us track task completion and keep our records up to date.
            </p>
          </div>
          
          <p>Kind regards,<br>
          Graeme Smart</p>
        </div>
      `;

      // Log Armata email to database before sending
      const armataEmailLog = await supabase
        .from("provider_emails")
        .insert({
          email_type: "vpn_setup",
          provider: "armata",
          subject: `VPN Profile Request: ${displayName}`,
          to_addresses: ["support@armata.co.za"],
          cc_addresses: [],
          html_content: vpnEmailHtml,
          staff_member_name: displayName,
          staff_member_email: email,
          request_data: requestData,
          confirmation_token: armataConfirmationToken,
          status: "pending"
        })
        .select()
        .single();

      if (armataEmailLog.error) {
        console.error("Failed to log Armata email:", armataEmailLog.error);
      }

      // Send email to Armata
      try {
        const armataResponse = await resend.emails.send({
          from: "Oricol Staff Management <onboarding@resend.dev>",
          to: ["support@armata.co.za"],
          subject: `VPN Profile Request: ${displayName}`,
          html: vpnEmailHtml,
        });

        console.log("Armata email sent successfully:", armataResponse);

        // Update log status to sent
        if (armataEmailLog.data) {
          await supabase
            .from("provider_emails")
            .update({
              status: "sent",
              sent_at: new Date().toISOString()
            })
            .eq("id", armataEmailLog.data.id);
        }

        sentEmails.push("Armata (VPN)");
      } catch (error: any) {
        console.error("Failed to send Armata email:", error);
        
        // Update log status to failed
        if (armataEmailLog.data) {
          await supabase
            .from("provider_emails")
            .update({
              status: "failed",
              error_message: error.message || error.toString()
            })
            .eq("id", armataEmailLog.data.id);
        }
        
        // Don't throw - allow Qwerti email to still succeed
        console.log("Continuing despite Armata email failure");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Staff onboarding emails sent successfully",
        sentTo: sentEmails
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-staff-onboarding-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send onboarding emails",
        details: error.toString()
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

serve(handler);
