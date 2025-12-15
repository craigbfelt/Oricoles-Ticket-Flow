import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Edit, Eye, EyeOff, Shield, Monitor, Key } from "lucide-react";
import { determineDeviceType, getDeviceTypeReason } from "@/lib/deviceTypeUtils";

// Antivirus status constants
const ANTIVIRUS_STATUS = {
  PROTECTED: 'protected',
  AT_RISK: 'at_risk',
  NOT_INSTALLED: 'not_installed',
  UNKNOWN: 'unknown'
} as const;

interface UserDetailsDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface UserDetails {
  // Basic info
  email: string;
  display_name: string | null;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  branch: string | null;
  
  // Credentials
  vpn_username: string | null;
  vpn_password: string | null;
  rdp_username: string | null;
  rdp_password: string | null;
  m365_username: string | null;
  m365_password: string | null;
  
  // Device info
  device_serial_number: string | null;
  device_name: string | null;
  device_model: string | null;
  device_type: string | null;
  
  // Antivirus info
  antivirus_name: string | null;
  antivirus_status: string | null;
  antivirus_enabled: boolean | null;
  
  // Flags
  is_thin_client: boolean;
}

export function UserDetailsDialog({ userId, open, onOpenChange, onUpdate }: UserDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [editedDetails, setEditedDetails] = useState<UserDetails | null>(null);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({
    vpn: false,
    rdp: false,
    m365: false
  });

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      // Fetch from master_user_list
      const { data: masterUser, error: masterError } = await supabase
        .from("master_user_list")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (masterError) throw masterError;

      if (!masterUser) {
        toast.error("User not found");
        onOpenChange(false);
        return;
      }

      // Fetch device assignment
      const { data: deviceAssignment } = await supabase
        .from("device_user_assignments")
        .select("*")
        .eq("user_email", masterUser.email)
        .eq("is_current", true)
        .maybeSingle();

      // Fetch device details from hardware_inventory if serial exists
      let deviceDetails = null;
      let antivirusInfo = null;
      if (deviceAssignment?.device_serial_number) {
        const { data: hardwareData } = await supabase
          .from("hardware_inventory")
          .select("*")
          .eq("serial_number", deviceAssignment.device_serial_number)
          .maybeSingle();
        
        deviceDetails = hardwareData;
        if (hardwareData) {
          antivirusInfo = {
            antivirus_name: hardwareData.antivirus_name,
            antivirus_status: hardwareData.antivirus_status,
            antivirus_enabled: hardwareData.antivirus_enabled
          };
        }
      }

      // Fetch VPN credentials
      const { data: vpnCreds } = await supabase
        .from("vpn_rdp_credentials")
        .select("*")
        .eq("email", masterUser.email)
        .eq("service_type", "VPN")
        .maybeSingle();

      // Fetch RDP credentials
      const { data: rdpCreds } = await supabase
        .from("vpn_rdp_credentials")
        .select("*")
        .eq("email", masterUser.email)
        .eq("service_type", "RDP")
        .maybeSingle();

      // Fetch M365 credentials
      const { data: m365Creds } = await supabase
        .from("vpn_rdp_credentials")
        .select("*")
        .eq("email", masterUser.email)
        .eq("service_type", "M365")
        .maybeSingle();

      // Check if user has device in Intune
      const { data: intuneDevice } = await supabase
        .from("intune_devices")
        .select("id")
        .eq("user_principal_name", masterUser.email)
        .maybeSingle();

      // Determine device type using the new utility function
      const deviceType = determineDeviceType({
        deviceSerialNumber: deviceAssignment?.device_serial_number,
        vpnUsername: vpnCreds?.username || masterUser.vpn_username,
        vpnPassword: vpnCreds?.password,
        rdpUsername: rdpCreds?.username || masterUser.rdp_username,
        rdpPassword: rdpCreds?.password,
        hasIntuneDevice: !!intuneDevice,
        deviceType: deviceDetails?.device_type
      });

      // Fetch branch name if branch_id exists
      let branchName = null;
      if (masterUser.branch_id) {
        const { data: branchData } = await supabase
          .from("branches")
          .select("name")
          .eq("id", masterUser.branch_id)
          .maybeSingle();
        branchName = branchData?.name;
      }

      const details: UserDetails = {
        email: masterUser.email,
        display_name: masterUser.display_name,
        // For CSV imports, job_title may contain the full_name
        full_name: masterUser.job_title || masterUser.display_name,
        job_title: masterUser.job_title,
        department: masterUser.department,
        branch: branchName,
        
        vpn_username: vpnCreds?.username || masterUser.vpn_username,
        vpn_password: vpnCreds?.password || null,
        rdp_username: rdpCreds?.username || masterUser.rdp_username,
        rdp_password: rdpCreds?.password || null,
        m365_username: m365Creds?.username || masterUser.email,
        m365_password: m365Creds?.password || null,
        
        device_serial_number: deviceAssignment?.device_serial_number || null,
        device_name: deviceDetails?.device_name || deviceAssignment?.device_name || null,
        device_model: deviceDetails?.model || deviceAssignment?.device_model || null,
        device_type: deviceDetails?.device_type || null,
        
        antivirus_name: antivirusInfo?.antivirus_name || null,
        antivirus_status: antivirusInfo?.antivirus_status || null,
        antivirus_enabled: antivirusInfo?.antivirus_enabled || null,
        
        is_thin_client: deviceType === 'thin_client'
      };

      setUserDetails(details);
      setEditedDetails(details);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedDetails) return;
    
    setSaving(true);
    try {
      // Update master_user_list
      // If full_name changed, update display_name as well
      const displayNameToUse = editedDetails.full_name || editedDetails.display_name;
      const { error: masterError } = await supabase
        .from("master_user_list")
        .update({
          display_name: displayNameToUse,
          job_title: editedDetails.full_name, // Store full_name in job_title for reference
          department: editedDetails.department,
          vpn_username: editedDetails.vpn_username,
          rdp_username: editedDetails.rdp_username,
        })
        .eq("id", userId);

      if (masterError) throw masterError;

      // Update VPN credentials if changed
      if (editedDetails.vpn_username || editedDetails.vpn_password) {
        const { error: vpnError } = await supabase
          .from("vpn_rdp_credentials")
          .upsert({
            email: editedDetails.email,
            service_type: "VPN",
            username: editedDetails.vpn_username || "",
            password: editedDetails.vpn_password || "",
            notes: `Updated on ${new Date().toISOString()}`
          }, {
            onConflict: "email,service_type"
          });
        
        if (vpnError) console.error("VPN update error:", vpnError);
      }

      // Update RDP credentials if changed
      if (editedDetails.rdp_username || editedDetails.rdp_password) {
        const { error: rdpError } = await supabase
          .from("vpn_rdp_credentials")
          .upsert({
            email: editedDetails.email,
            service_type: "RDP",
            username: editedDetails.rdp_username || "",
            password: editedDetails.rdp_password || "",
            notes: `Updated on ${new Date().toISOString()}`
          }, {
            onConflict: "email,service_type"
          });
        
        if (rdpError) console.error("RDP update error:", rdpError);
      }

      // Update M365 credentials if changed
      if (editedDetails.m365_password) {
        const { error: m365Error } = await supabase
          .from("vpn_rdp_credentials")
          .upsert({
            email: editedDetails.email,
            service_type: "M365",
            username: editedDetails.m365_username || editedDetails.email,
            password: editedDetails.m365_password,
            notes: `Updated on ${new Date().toISOString()}`
          }, {
            onConflict: "email,service_type"
          });
        
        if (m365Error) console.error("M365 update error:", m365Error);
      }

      toast.success("User details updated successfully");
      setEditing(false);
      setUserDetails(editedDetails);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving user details:", error);
      toast.error("Failed to save user details");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedDetails(userDetails);
    setEditing(false);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const renderPasswordField = (
    label: string,
    value: string | null,
    field: keyof UserDetails,
    visibilityKey: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={showPasswords[visibilityKey] ? "text" : "password"}
          value={editing ? (editedDetails?.[field] as string || "") : (value || "N/A")}
          onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, [field]: e.target.value } : null)}
          disabled={!editing}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => togglePasswordVisibility(visibilityKey)}
        >
          {showPasswords[visibilityKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!userDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{userDetails.display_name || userDetails.email}</span>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View and edit user information, credentials, and device details
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="device">Device & Security</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userDetails.email} disabled />
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editing ? (editedDetails?.display_name || "") : (userDetails.display_name || "N/A")}
                onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editing ? (editedDetails?.full_name || "") : (userDetails.full_name || "N/A")}
                onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                disabled={!editing}
              />
              <p className="text-xs text-muted-foreground">
                Note: Changes to full name will also update display name
              </p>
            </div>

            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={editing ? (editedDetails?.job_title || "") : (userDetails.job_title || "N/A")}
                onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={editing ? (editedDetails?.department || "") : (userDetails.department || "N/A")}
                onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, department: e.target.value } : null)}
                disabled={!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={userDetails.branch || "N/A"} disabled />
              <p className="text-xs text-muted-foreground">Branch can be updated via CSV import</p>
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <Key className="h-4 w-4" />
                VPN Credentials
              </div>
              <div className="space-y-2">
                <Label>VPN Username</Label>
                <Input
                  value={editing ? (editedDetails?.vpn_username || "") : (userDetails.vpn_username || "N/A")}
                  onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, vpn_username: e.target.value } : null)}
                  disabled={!editing}
                />
              </div>
              {renderPasswordField("VPN Password", userDetails.vpn_password, "vpn_password", "vpn")}
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <Key className="h-4 w-4" />
                RDP Credentials
              </div>
              <div className="space-y-2">
                <Label>RDP Username</Label>
                <Input
                  value={editing ? (editedDetails?.rdp_username || "") : (userDetails.rdp_username || "N/A")}
                  onChange={(e) => editing && setEditedDetails(prev => prev ? { ...prev, rdp_username: e.target.value } : null)}
                  disabled={!editing}
                />
              </div>
              {renderPasswordField("RDP Password", userDetails.rdp_password, "rdp_password", "rdp")}
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <Key className="h-4 w-4" />
                Microsoft 365 Credentials
              </div>
              <div className="space-y-2">
                <Label>365 Username</Label>
                <Input
                  value={userDetails.m365_username || "N/A"}
                  disabled
                />
              </div>
              {renderPasswordField("365 Password", userDetails.m365_password, "m365_password", "m365")}
            </div>
          </TabsContent>

          <TabsContent value="device" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 font-semibold">
                <Monitor className="h-4 w-4" />
                Device Information
              </div>
              
              {userDetails.is_thin_client ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    <Monitor className="h-3 w-3 mr-1" />
                    Thin Client
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    This user is using a thin client (no serial number tracked)
                  </span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Device Serial Number</Label>
                    <Input value={userDetails.device_serial_number || "N/A"} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Device Name</Label>
                    <Input value={userDetails.device_name || "N/A"} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Device Model</Label>
                    <Input value={userDetails.device_model || "N/A"} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label>Device Type</Label>
                    <Input value={userDetails.device_type || "N/A"} disabled />
                  </div>
                </>
              )}
            </div>

            {!userDetails.is_thin_client && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2 font-semibold">
                  <Shield className="h-4 w-4" />
                  Antivirus / Security Status
                </div>

                {userDetails.antivirus_name ? (
                  <>
                    <div className="space-y-2">
                      <Label>Antivirus Name</Label>
                      <div className="flex items-center gap-2">
                        <Input value={userDetails.antivirus_name} disabled />
                        {userDetails.antivirus_enabled && (
                          <Badge variant="default" className="bg-green-500">
                            Enabled
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={userDetails.antivirus_status === ANTIVIRUS_STATUS.PROTECTED ? 'default' : 'destructive'}
                        >
                          {userDetails.antivirus_status || ANTIVIRUS_STATUS.UNKNOWN}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Antivirus information not available from Intune. This data will be populated when synced from Microsoft 365.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
