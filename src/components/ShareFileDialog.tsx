import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShareFileDialogProps {
  documentId: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SystemUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
}

export function ShareFileDialog({ documentId, documentName, open, onOpenChange }: ShareFileDialogProps) {
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [shareType, setShareType] = useState<"user" | "group">("user");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"view" | "edit" | "download">("view");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSystemUsers();
      fetchUserGroups();
    }
  }, [open]);

  const fetchSystemUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email")
      .neq("user_id", session.user.id) // Don't show current user
      .order("full_name");

    if (error) {
      console.error("Failed to fetch users:", error);
    } else {
      setSystemUsers(data || []);
    }
  };

  const fetchUserGroups = async () => {
    // @ts-ignore - Table exists but types haven't regenerated yet
    const { data, error } = await (supabase as any)
      .from("user_groups")
      .select("id, name, description")
      .order("name");

    if (error) {
      console.error("Failed to fetch groups:", error);
    } else {
      setUserGroups(data || []);
    }
  };

  const handleShare = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      return;
    }

    if (shareType === "user" && !selectedUserId) {
      toast.error("Please select a user to share with");
      return;
    }

    if (shareType === "group" && !selectedGroupId) {
      toast.error("Please select a group to share with");
      return;
    }

    setIsSharing(true);

    const shareData: any = {
      document_id: documentId,
      shared_by: session.user.id,
      permission_level: permissionLevel,
    };

    if (shareType === "user") {
      shareData.shared_with_user = selectedUserId;
    } else {
      shareData.shared_with_group = selectedGroupId;
    }

    // @ts-ignore - Table exists but types haven't regenerated yet
    const { error } = await (supabase as any)
      .from("shared_files")
      .insert(shareData);

    if (error) {
      toast.error("Failed to share file");
      console.error(error);
    } else {
      toast.success(`File shared successfully with ${shareType === "user" ? "user" : "group"}`);
      onOpenChange(false);
      setSelectedUserId("");
      setSelectedGroupId("");
      setPermissionLevel("view");
    }

    setIsSharing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share File
          </DialogTitle>
          <DialogDescription>
            Share "{documentName}" with users or groups
          </DialogDescription>
        </DialogHeader>

        <Tabs value={shareType} onValueChange={(v) => setShareType(v as "user" | "group")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">
              <User className="h-4 w-4 mr-2" />
              Share with User
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              Share with Group
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="space-y-4">
            <div>
              <Label htmlFor="selectUser">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {systemUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email || user.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div>
              <Label htmlFor="selectGroup">Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {userGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                      {group.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {group.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <Label htmlFor="permissionLevel">Permission Level</Label>
          <Select value={permissionLevel} onValueChange={(v) => setPermissionLevel(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="view">View Only</SelectItem>
              <SelectItem value="download">View & Download</SelectItem>
              <SelectItem value="edit">View, Download & Edit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSharing}>
            {isSharing ? "Sharing..." : "Share File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
