import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserCredentialsViewProps {
  userId: string;
  userEmail: string | null;
  vpnUsername?: string | null;
  vpnPassword?: string | null;
  rdpUsername?: string | null;
  rdpPassword?: string | null;
  onUpdate?: () => void;
}

export const UserCredentialsView = ({
  userId,
  userEmail,
  vpnUsername,
  vpnPassword,
  rdpUsername,
  rdpPassword,
  onUpdate,
}: UserCredentialsViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editVpnUsername, setEditVpnUsername] = useState(vpnUsername || "");
  const [editVpnPassword, setEditVpnPassword] = useState(vpnPassword || "");
  const [editRdpUsername, setEditRdpUsername] = useState(rdpUsername || "");
  const [editRdpPassword, setEditRdpPassword] = useState(rdpPassword || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          vpn_username: editVpnUsername || null,
          vpn_password: editVpnPassword || null,
          rdp_username: editRdpUsername || null,
          rdp_password: editRdpPassword || null,
        } as any)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Credentials updated successfully");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating credentials:", error);
      toast.error("Failed to update credentials");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditVpnUsername(vpnUsername || "");
    setEditVpnPassword(vpnPassword || "");
    setEditRdpUsername(rdpUsername || "");
    setEditRdpPassword(rdpPassword || "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              User Credentials
            </CardTitle>
            <CardDescription>VPN and RDP access credentials for {userEmail}</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* VPN Credentials */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            VPN Access
          </h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="vpn-username">VPN Username</Label>
              {isEditing ? (
                <Input
                  id="vpn-username"
                  value={editVpnUsername}
                  onChange={(e) => setEditVpnUsername(e.target.value)}
                  placeholder="Enter VPN username"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <code className="text-sm flex-1">{vpnUsername || "Not set"}</code>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vpn-password">VPN Password</Label>
              <div className="flex gap-2">
                {isEditing ? (
                  <Input
                    id="vpn-password"
                    type="text"
                    value={editVpnPassword}
                    onChange={(e) => setEditVpnPassword(e.target.value)}
                    placeholder="Enter VPN password"
                    className="flex-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md flex-1">
                    <code className="text-sm flex-1">
                      {vpnPassword === '***ENCRYPTED***' ? '••••••••' : (vpnPassword || "Not set")}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RDP Credentials */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            RDP Access
          </h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="rdp-username">RDP Username</Label>
              {isEditing ? (
                <Input
                  id="rdp-username"
                  value={editRdpUsername}
                  onChange={(e) => setEditRdpUsername(e.target.value)}
                  placeholder="Enter RDP username"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <code className="text-sm flex-1">{rdpUsername || "Not set"}</code>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdp-password">RDP Password</Label>
              <div className="flex gap-2">
                {isEditing ? (
                  <Input
                    id="rdp-password"
                    type="text"
                    value={editRdpPassword}
                    onChange={(e) => setEditRdpPassword(e.target.value)}
                    placeholder="Enter RDP password"
                    className="flex-1"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md flex-1">
                    <code className="text-sm flex-1">
                      {rdpPassword === '***ENCRYPTED***' ? '••••••••' : (rdpPassword || "Not set")}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!vpnUsername && !rdpUsername && !isEditing && (
          <div className="text-center py-6 bg-muted/50 rounded-lg">
            <Key className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No credentials configured for this user
            </p>
            <Button variant="link" className="mt-2" onClick={() => setIsEditing(true)}>
              Add credentials
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
