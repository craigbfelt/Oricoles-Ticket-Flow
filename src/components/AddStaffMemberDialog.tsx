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
import { UserPlus, AlertCircle } from "lucide-react";
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
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  
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

  const handleSubmit = async () => {
    if (!displayName || !email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
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

      toast({
        title: "Success",
        description: `Staff member ${displayName} added successfully`,
      });

      // Reset form
      setDisplayName("");
      setEmail("");
      setJobTitle("");
      setDepartment("");
      setSelectedLicense("");
      setOldUserId("");
      setNeedsRdp(false);
      setNeedsVpn(false);
      setRdpUsername("");
      setRdpPassword("");
      setVpnUsername("");
      setVpnPassword("");
      
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Add a new staff member with Microsoft 365 license and access credentials
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="IT"
              />
            </div>
          </div>

          {/* Microsoft 365 License */}
          <div className="space-y-4 border-t pt-4">
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

          {/* RDP License */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needsRdp"
                checked={needsRdp}
                onChange={(e) => setNeedsRdp(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="needsRdp" className="font-semibold">RDP License Required</Label>
            </div>

            {needsRdp && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    RDP licenses must be requested from Qwerti/Nymbis
                  </AlertDescription>
                </Alert>

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
                    type="password"
                    value={rdpPassword}
                    onChange={(e) => setRdpPassword(e.target.value)}
                    placeholder="Enter password"
                  />
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

          {/* VPN License */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needsVpn"
                checked={needsVpn}
                onChange={(e) => setNeedsVpn(e.target.checked)}
                className="h-4 w-4"
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
                    type="password"
                    value={vpnPassword}
                    onChange={(e) => setVpnPassword(e.target.value)}
                    placeholder="Enter password"
                  />
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding..." : "Add Staff Member"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
