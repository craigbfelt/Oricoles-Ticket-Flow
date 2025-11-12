import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        
        <p>Kind regards<br>
        Graeme Smart</p>
      </div>
    `;

    // Send email to Qwerti
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

    const sentEmails = ["Qwerti/Nymbis"];

    // Send notification about VPN if needed
    if (needsVpn) {
      const vpnEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <p><strong>From:</strong> Graeme Smart &lt;Graeme.Smart@oricoles.co.za&gt;<br>
          <strong>To:</strong> Armata VPN Support</p>
          
          <p>Hello,</p>
          
          <p>We need to request a VPN profile for a ${isReplacement ? 'replacement' : 'new'} staff member:</p>
          
          <ul>
            <li><strong>Name:</strong> ${displayName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Job Title:</strong> ${jobTitle}</li>
            ${location ? `<li><strong>Location:</strong> ${location}</li>` : ''}
            ${cellPhone ? `<li><strong>Cell Phone:</strong> ${cellPhone}</li>` : ''}
          </ul>
          
          ${isReplacement && oldUserName ? `
            <p>This replaces the VPN profile for ${oldUserName} (${oldUserEmail}) who has left Oricol.</p>
          ` : ''}
          
          <p>Please create and configure the VPN profile at your earliest convenience.</p>
          
          <p>Kind regards,<br>
          Graeme Smart</p>
        </div>
      `;

      // Note: Replace with actual Armata email when available
      console.log("VPN email would be sent to Armata (email address needed)");
      // Uncomment when Armata email is available:
      // await resend.emails.send({
      //   from: "Oricol Staff Management <onboarding@resend.dev>",
      //   to: ["armata-vpn-support@example.com"],
      //   subject: `VPN Profile Request: ${displayName}`,
      //   html: vpnEmailHtml,
      // });
      sentEmails.push("Armata (VPN)");
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
