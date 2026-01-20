import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { UserPlus, AlertCircle, Mail, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface License {
  id: string;
  license_name: string;
  vendor: string;
  total_seats: number;
  used_seats: number;
  assigned_to: string | null;
}

interface DirectoryUser {
  id: string;
  display_name: string | null;
  email: string | null;
}

export function AddStaffMemberDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [existingUsers, setExistingUsers] = useState<DirectoryUser[]>([]);
  
  // Basic Information
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [location, setLocation] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  
  // Replacement Info
  const [isReplacement, setIsReplacement] = useState(false);
  const [oldUserName, setOldUserName] = useState("");
  const [oldUserEmail, setOldUserEmail] = useState("");
  const [deleteOldProfile, setDeleteOldProfile] = useState(true);
  const [createEmailAlias, setCreateEmailAlias] = useState(false);
  const [aliasForwardTo, setAliasForwardTo] = useState("");
  
  // Access Rights
  const [copyAccessFrom, setCopyAccessFrom] = useState("");
  const [folderAccess, setFolderAccess] = useState("");
  const [emailDistributions, setEmailDistributions] = useState("");
  const [printerAccess, setPrinterAccess] = useState("");
  const [requireMfa, setRequireMfa] = useState(true);
  
  // License management
  const [licenseOption, setLicenseOption] = useState<"unused" | "migrate">("unused");
  const [selectedLicense, setSelectedLicense] = useState("");
  const [oldUserId, setOldUserId] = useState("");
  
  // RDP & VPN
  const [needsRdp, setNeedsRdp] = useState(false);
  const [rdpUsername, setRdpUsername] = useState("");
  const [rdpPassword, setRdpPassword] = useState("");
  const [rdpNotes, setRdpNotes] = useState("License requested from Qwerti/Nymbis");
  
  const [needsVpn, setNeedsVpn] = useState(false);
  const [vpnUsername, setVpnUsername] = useState("");
  const [vpnPassword, setVpnPassword] = useState("");
  const [vpnNotes, setVpnNotes] = useState("Profile requested from Armata");
  
  // Courier options
  const [needsCourier, setNeedsCourier] = useState(false);
  const [courierPlatform, setCourierPlatform] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  useEffect(() => {
    if (open) {
      fetchLicenses();
      fetchExistingUsers();
    }
  }, [open]);

  const fetchLicenses = async () => {
    const { data, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("vendor", "Microsoft")
      .order("license_name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch licenses",
        variant: "destructive",
      });
    } else {
      setAvailableLicenses(data || []);
    }
  };

  const fetchExistingUsers = async () => {
    const { data, error } = await supabase
      .from("directory_users")
      .select("id, display_name, email")
      .order("display_name");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setExistingUsers(data || []);
    }
  };

  const getUnusedLicenses = () => {
    return availableLicenses.filter(
      (license) => license.used_seats < license.total_seats
    );
  };

  const generateQwertiEmail = () => {
    const usernamePart = displayName.replace(/\s+/g, '.');
    
    return `From: Graeme Smart <Graeme.Smart@oricoles.co.za>
To: Qwerti Managed Services <support@qwerti.co.za>; Shaun Chetty <shaun.chetty@qwerti.co.za>
cc: Jerusha Naidoo <Jerusha.Naidoo@oricoles.co.za>; Craig Felt <craig@zerobitone.co.za>; Andrew Fernandes <Andrew.Fernandes@oricoles.co.za>; Peter Allen <Peter.Allen@oricoles.co.za>; Muhammed Rassool <Muhammed.Rassool@Oricoles.co.za>

Hello Support / Shaun,

${isReplacement ? `In brief, ${oldUserName} was a staff member${location ? ` in ${location}` : ''}, and has left Oricol.
I would now like to use their RDP and O365 license for ${displayName} who is our ${jobTitle}${location ? ` – ${location}` : ''}.
Can we make these changes today, ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.` : `We have a new staff member joining: ${displayName} who is our ${jobTitle}${location ? ` in ${location}` : ''}.`}

Please ${isReplacement ? 'move forward to act as follows on our active directory and effectively reallocate the license' + (oldUserName ? ` of ${oldUserName}` : '') + ` to ${displayName}` : 'act as follows on our active directory'}:

NEW USER SETUP:
1. New user is ${usernamePart}
2. Email is ${email}
3. Password to be issued is ${password}
${copyAccessFrom ? `4. In terms of access rights/privileges, please can ${displayName.split(' ')[0]}'s profile be set up with the same rights as ${copyAccessFrom}${folderAccess ? `, so that they can access ${folderAccess}` : ''}.` : folderAccess ? `4. Folder access required: ${folderAccess}` : ''}
${emailDistributions ? `5. Email distribution: Please place ${displayName.split(' ')[0]} on ${emailDistributions}` : ''}
${printerAccess ? `6. ${printerAccess}` : ''}
${requireMfa && cellPhone ? `7. Multi Factor Authentication will need to be set up too for ${displayName.split(' ')[0]} – ${displayName.split(' ')[0]} is with us (cell ${cellPhone}) and Jerusha can work with you to get this set up for ${displayName.split(' ')[0]}` : ''}

${isReplacement && oldUserName ? `
OLD PROFILE: ${oldUserName}
1. ${deleteOldProfile ? 'The profile can be deleted.' : 'Please disable the profile.'}
${createEmailAlias && aliasForwardTo ? `2. Please can we add ${oldUserEmail} as an ALIAS to ${aliasForwardTo} (email forward already in place, plus a PST is done and in place of the old emails of ${oldUserName.split(' ')[0]} under ${aliasForwardTo})` : ''}` : ''}

If I have missed anything, please feel free to reach out to me or Jerusha and we can resolve very promptly.

Kind regards
Graeme Smart`;
  };

  const handleSubmit = async () => {
    if (!displayName || !email || !password) {
      toast({
        title: "Validation Error",
        description: "Name, email, and password are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Create directory user
      const { data: newUser, error: userError } = await supabase
        .from("directory_users")
        .insert({
          display_name: displayName,
          email: email,
          user_principal_name: email,
          job_title: jobTitle || null,
          department: department || null,
          account_enabled: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Handle Microsoft 365 License
      if (selectedLicense) {
        const license = availableLicenses.find(l => l.id === selectedLicense);
        if (!license) throw new Error("Selected license not found");

        if (licenseOption === "unused") {
          // Assign unused license
          await supabase
            .from("licenses")
            .update({
              used_seats: license.used_seats + 1,
              assigned_to: newUser.id,
            })
            .eq("id", selectedLicense);
        } else if (licenseOption === "migrate" && oldUserId) {
          // Migrate license from old user to new user
          await supabase
            .from("licenses")
            .update({
              assigned_to: newUser.id,
            })
            .eq("id", selectedLicense);

          toast({
            title: "License Migrated",
            description: `License migrated from old user to ${displayName}`,
          });
        }
      }

      // 3. Create RDP credentials if needed
      if (needsRdp && rdpUsername && rdpPassword) {
        const { error: rdpError } = await supabase
          .from("vpn_rdp_credentials")
          .insert({
            service_type: "rdp",
            username: rdpUsername,
            password: rdpPassword,
            email: email,
            notes: rdpNotes,
          });

        if (rdpError) throw rdpError;
      }

      // 4. Create VPN credentials if needed
      if (needsVpn && vpnUsername && vpnPassword) {
        const { error: vpnError } = await supabase
          .from("vpn_rdp_credentials")
          .insert({
            service_type: "vpn",
            username: vpnUsername,
            password: vpnPassword,
            email: email,
            notes: vpnNotes,
          });

        if (vpnError) throw vpnError;
      }

      // 5. Send automated emails to providers
      try {
        const emailData = {
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
          needsCourier,
          courierPlatform: needsCourier ? courierPlatform : undefined,
          deliveryAddress: needsCourier ? deliveryAddress : undefined,
        };

        const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
          'send-staff-onboarding-email',
          { body: emailData }
        );

        if (emailError) {
          console.error("Email sending error:", emailError);
          // Generate email for clipboard as fallback
          const qwertiEmail = generateQwertiEmail();
          await navigator.clipboard.writeText(qwertiEmail);
          
          toast({
            title: "Staff Member Added",
            description: "Staff member created, but automated emails failed. Email copied to clipboard as fallback.",
            variant: "destructive",
          });
        } else {
          console.log("Emails sent successfully:", emailResponse);
          
          // Also copy to clipboard as backup
          const qwertiEmail = generateQwertiEmail();
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(qwertiEmail);
          }
          
          toast({
            title: "Success!",
            description: `Staff member added and emails sent to ${emailResponse?.sentTo?.join(', ') || 'providers'}. Email also copied to clipboard.`,
          });
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Fallback to clipboard
        const qwertiEmail = generateQwertiEmail();
        await navigator.clipboard.writeText(qwertiEmail);
        
        toast({
          title: "Partial Success",
          description: "Staff member added. Email copied to clipboard (automated sending unavailable).",
        });
      }

      // Reset form
      setDisplayName("");
      setEmail("");
      setPassword("");
      setCellPhone("");
      setLocation("");
      setJobTitle("");
      setDepartment("");
      setIsReplacement(false);
      setOldUserName("");
      setOldUserEmail("");
      setDeleteOldProfile(true);
      setCreateEmailAlias(false);
      setAliasForwardTo("");
      setCopyAccessFrom("");
      setFolderAccess("");
      setEmailDistributions("");
      setPrinterAccess("");
      setRequireMfa(true);
      setSelectedLicense("");
      setOldUserId("");
      setNeedsRdp(false);
      setNeedsVpn(false);
      setRdpUsername("");
      setRdpPassword("");
      setVpnUsername("");
      setVpnPassword("");
      setNeedsCourier(false);
      setCourierPlatform("");
      setDeliveryAddress("");
      
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding staff member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unusedLicenses = getUnusedLicenses();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Complete the form below. Emails will be automatically sent to providers, and also copied to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              Basic Information
              <Badge variant="outline">Required</Badge>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Mathiatse Ramaphakela"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., Mathiatse.Ramaphakela@oricoles.co.za"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g., @Ve0lia!113"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cellPhone">Cell Phone</Label>
                <Input
                  id="cellPhone"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  placeholder="e.g., 0665113936"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Intern"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Durban liquid treatment plant"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Operations"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Replacement Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isReplacement"
                checked={isReplacement}
                onCheckedChange={(checked) => setIsReplacement(checked as boolean)}
              />
              <Label htmlFor="isReplacement" className="font-semibold">
                This is a replacement for a departing staff member
              </Label>
            </div>

            {isReplacement && (
              <div className="grid gap-4 pl-6 border-l-2 border-muted">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldUserName">Departing Staff Name</Label>
                    <Input
                      id="oldUserName"
                      value={oldUserName}
                      onChange={(e) => setOldUserName(e.target.value)}
                      placeholder="e.g., Rishen Nohur"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oldUserEmail">Departing Staff Email</Label>
                    <Input
                      id="oldUserEmail"
                      type="email"
                      value={oldUserEmail}
                      onChange={(e) => setOldUserEmail(e.target.value)}
                      placeholder="e.g., Rishen.Nohur@oricoles.co.za"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deleteOldProfile"
                    checked={deleteOldProfile}
                    onCheckedChange={(checked) => setDeleteOldProfile(checked as boolean)}
                  />
                  <Label htmlFor="deleteOldProfile">Delete old profile</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createEmailAlias"
                    checked={createEmailAlias}
                    onCheckedChange={(checked) => setCreateEmailAlias(checked as boolean)}
                  />
                  <Label htmlFor="createEmailAlias">Create email alias for old email address</Label>
                </div>

                {createEmailAlias && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="aliasForwardTo">Forward old email to</Label>
                    <Input
                      id="aliasForwardTo"
                      value={aliasForwardTo}
                      onChange={(e) => setAliasForwardTo(e.target.value)}
                      placeholder="e.g., Muhammed Rassool"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Access Rights */}
          <div className="space-y-4">
            <h3 className="font-semibold">Access Rights & Privileges</h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="copyAccessFrom">Copy access rights from existing user</Label>
                <Input
                  id="copyAccessFrom"
                  value={copyAccessFrom}
                  onChange={(e) => setCopyAccessFrom(e.target.value)}
                  placeholder="e.g., Rishen Nohur or other Durban users"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="folderAccess">Folder Access</Label>
                <Input
                  id="folderAccess"
                  value={folderAccess}
                  onChange={(e) => setFolderAccess(e.target.value)}
                  placeholder="e.g., National Folder and Durban folder"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailDistributions">Email Distribution Lists</Label>
                <Input
                  id="emailDistributions"
                  value={emailDistributions}
                  onChange={(e) => setEmailDistributions(e.target.value)}
                  placeholder='e.g., "Oricol ALL" and "Oricol KZN"'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="printerAccess">Printer Setup</Label>
                <Input
                  id="printerAccess"
                  value={printerAccess}
                  onChange={(e) => setPrinterAccess(e.target.value)}
                  placeholder="e.g., Please set up the normal Durban default printers"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireMfa"
                  checked={requireMfa}
                  onCheckedChange={(checked) => setRequireMfa(checked as boolean)}
                />
                <Label htmlFor="requireMfa">Multi-Factor Authentication (MFA) required</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Microsoft 365 License */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Microsoft 365 License</h3>
              {unusedLicenses.length === 0 && (
                <Badge variant="destructive">No unused licenses</Badge>
              )}
            </div>

            {unusedLicenses.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {unusedLicenses.length} unused license(s) available
                </AlertDescription>
              </Alert>
            )}

            <RadioGroup value={licenseOption} onValueChange={(v) => setLicenseOption(v as "unused" | "migrate")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unused" id="unused" />
                <Label htmlFor="unused">Assign unused license</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="migrate" id="migrate" />
                <Label htmlFor="migrate">Migrate license from existing user</Label>
              </div>
            </RadioGroup>

            {licenseOption === "unused" && (
              <div className="space-y-2">
                <Label>Select License</Label>
                <Select value={selectedLicense} onValueChange={setSelectedLicense}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a license" />
                  </SelectTrigger>
                  <SelectContent>
                    {unusedLicenses.map((license) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.license_name} ({license.total_seats - license.used_seats} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {unusedLicenses.length === 0 && (
                  <p className="text-sm text-destructive">
                    No unused licenses. Request new licenses from Braintree or migrate from existing user.
                  </p>
                )}
              </div>
            )}

            {licenseOption === "migrate" && (
              <>
                <div className="space-y-2">
                  <Label>Select License to Migrate</Label>
                  <Select value={selectedLicense} onValueChange={setSelectedLicense}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a license" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLicenses.map((license) => (
                        <SelectItem key={license.id} value={license.id}>
                          {license.license_name} ({license.used_seats}/{license.total_seats} used)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Migrate From User</Label>
                  <Select value={oldUserId} onValueChange={setOldUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user to migrate from" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To request new Microsoft 365 licenses, contact Braintree
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* RDP License */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsRdp"
                checked={needsRdp}
                onCheckedChange={(checked) => setNeedsRdp(checked as boolean)}
              />
              <Label htmlFor="needsRdp" className="font-semibold">
                RDP License Required {isReplacement && "(will be migrated from departing user)"}
              </Label>
            </div>

            {needsRdp && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    RDP licenses must be requested from Qwerti/Nymbis
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rdpUsername">RDP Username</Label>
                    <Input
                      id="rdpUsername"
                      value={rdpUsername}
                      onChange={(e) => setRdpUsername(e.target.value)}
                      placeholder="rdp_username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rdpPassword">RDP Password</Label>
                    <Input
                      id="rdpPassword"
                      type="text"
                      value={rdpPassword}
                      onChange={(e) => setRdpPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdpNotes">RDP Notes</Label>
                  <Textarea
                    id="rdpNotes"
                    value={rdpNotes}
                    onChange={(e) => setRdpNotes(e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* VPN License */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsVpn"
                checked={needsVpn}
                onCheckedChange={(checked) => setNeedsVpn(checked as boolean)}
              />
              <Label htmlFor="needsVpn" className="font-semibold">VPN Profile Required</Label>
            </div>

            {needsVpn && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    VPN profiles must be requested from Armata
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vpnUsername">VPN Username</Label>
                    <Input
                      id="vpnUsername"
                      value={vpnUsername}
                      onChange={(e) => setVpnUsername(e.target.value)}
                      placeholder="vpn_username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vpnPassword">VPN Password</Label>
                    <Input
                      id="vpnPassword"
                      type="text"
                      value={vpnPassword}
                      onChange={(e) => setVpnPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vpnNotes">VPN Notes</Label>
                  <Textarea
                    id="vpnNotes"
                    value={vpnNotes}
                    onChange={(e) => setVpnNotes(e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Courier Delivery */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needsCourier"
                checked={needsCourier}
                onCheckedChange={(checked) => setNeedsCourier(checked as boolean)}
              />
              <Label htmlFor="needsCourier" className="font-semibold">Needs Courier Delivery</Label>
            </div>

            {needsCourier && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="courierPlatform">Preferred Courier *</Label>
                  <Select value={courierPlatform} onValueChange={setCourierPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courier_guy">The Courier Guy</SelectItem>
                      <SelectItem value="aramex">Aramex</SelectItem>
                      <SelectItem value="dhl">DHL</SelectItem>
                      <SelectItem value="pargo">Pargo</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Full delivery address including postal code"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Add Staff & Generate Email
                </>
              )}
            </Button>
          </div>
          
          <Alert>
            <Copy className="h-4 w-4" />
            <AlertDescription>
              After clicking "Add Staff & Generate Email", automated emails will be sent to Qwerti (and other providers as needed). The email will also be copied to your clipboard as a backup.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
