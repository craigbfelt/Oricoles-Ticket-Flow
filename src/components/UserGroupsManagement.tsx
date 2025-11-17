import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface SystemUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export function UserGroupsManagement() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchSystemUsers();
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    // @ts-ignore - Table exists but types haven't regenerated yet
    const { data, error } = await (supabase as any)
      .from("user_groups")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to fetch groups");
      console.error(error);
    } else {
      setGroups(data || []);
    }
    setIsLoading(false);
  };

  const fetchSystemUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email")
      .order("full_name");

    if (error) {
      console.error("Failed to fetch system users:", error);
    } else {
      setSystemUsers(data || []);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    console.log("UserGroupsManagement: Creating group:", { name: groupName, description: groupDescription });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("UserGroupsManagement: No active session");
      toast.error("Authentication required", {
        description: "Please log in to create groups"
      });
      return;
    }

    console.log("UserGroupsManagement: Current user ID:", session.user.id);
    
    // Check if user has admin role
    console.log("UserGroupsManagement: Checking user permissions");
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (rolesError) {
      console.error("UserGroupsManagement: Error checking user roles:", rolesError);
    } else {
      console.log("UserGroupsManagement: User roles:", userRoles);
    }

    const hasAdminRole = userRoles?.some(r => r.role === 'admin') || false;
    
    if (!hasAdminRole) {
      console.error("UserGroupsManagement: User does not have admin role");
      toast.error("Permission denied", {
        description: "Only administrators can create user groups. Please contact your administrator to grant you admin privileges."
      });
      return;
    }

    console.log("UserGroupsManagement: Attempting to insert group");

    // @ts-ignore - Table exists but types haven't regenerated yet
    const { error } = await (supabase as any)
      .from("user_groups")
      .insert({
        name: groupName,
        description: groupDescription || null,
        created_by: session.user.id,
      });

    if (error) {
      console.error("UserGroupsManagement: Database error creating group:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      let errorDescription = error.message;
      let troubleshootingSteps = "";
      
      if (error.code === "23505") {
        errorDescription = "A group with this name already exists.";
        troubleshootingSteps = "\n\nPlease choose a different group name.";
      } else if (error.code === "42501") {
        errorDescription = "Permission denied - you do not have the required admin privileges.";
        troubleshootingSteps = "\n\nTroubleshooting:\n1. Verify you have 'admin' role in user_roles table\n2. Contact your system administrator to grant admin access\n3. Check that RLS policies are properly configured";
      } else if (error.message?.includes("violates row-level security")) {
        errorDescription = "Row-level security policy violation - access denied.";
        troubleshootingSteps = "\n\nTroubleshooting:\n1. Ensure you have admin role in user_roles table\n2. Check database logs for RLS policy details\n3. Verify that user_groups RLS policies allow admin access";
      } else if (error.message?.includes("JWT") || error.message?.includes("auth")) {
        errorDescription = "Authentication error - your session may have expired.";
        troubleshootingSteps = "\n\nPlease log out and log back in.";
      } else if (error.message?.includes("does not exist") || error.code === 'PGRST116') {
        errorDescription = "user_groups table not found - database migration may not have been applied.";
        troubleshootingSteps = "\n\nPlease contact your administrator to run database migrations.";
      }
      
      toast.error("Failed to create group", {
        description: `${errorDescription}${troubleshootingSteps}\n\nTechnical details: ${error.message}\nError code: ${error.code || 'N/A'}`,
        duration: 10000
      });
      console.error(error);
    } else {
      console.log("UserGroupsManagement: Group created successfully");
      toast.success("Group created successfully");
      setCreateDialogOpen(false);
      setGroupName("");
      setGroupDescription("");
      fetchGroups();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) {
      return;
    }

    console.log("UserGroupsManagement: Deleting group:", groupId);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Authentication required");
      return;
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasAdminRole = userRoles?.some(r => r.role === 'admin') || false;
    
    if (!hasAdminRole) {
      toast.error("Permission denied", {
        description: "Only administrators can delete user groups."
      });
      return;
    }

    // @ts-ignore - Table exists but types haven't regenerated yet
    const { error } = await (supabase as any)
      .from("user_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      console.error("UserGroupsManagement: Database error deleting group:", error);
      
      let errorDescription = error.message;
      let troubleshootingSteps = "";
      
      if (error.code === "42501") {
        errorDescription = "Permission denied - you do not have the required admin privileges.";
        troubleshootingSteps = "\n\nTroubleshooting:\n1. Verify you have 'admin' role in user_roles table\n2. Contact your system administrator to grant admin access";
      } else if (error.message?.includes("violates row-level security")) {
        errorDescription = "Row-level security policy violation - access denied.";
        troubleshootingSteps = "\n\nEnsure you have admin role assigned in user_roles table.";
      } else if (error.code === "23503") {
        errorDescription = "Cannot delete group - it has dependent records (e.g., folder permissions, group members).";
        troubleshootingSteps = "\n\nPlease remove all group members and permissions first.";
      }
      
      toast.error("Failed to delete group", {
        description: `${errorDescription}${troubleshootingSteps}\n\nTechnical details: ${error.message}`,
        duration: 8000
      });
      console.error(error);
    } else {
      console.log("UserGroupsManagement: Group deleted successfully");
      toast.success("Group deleted successfully");
      fetchGroups();
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    console.log("UserGroupsManagement: Adding member to group:", {
      group: selectedGroup.name,
      userId: selectedUserId
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("UserGroupsManagement: No active session");
      toast.error("Authentication required", {
        description: "Please log in to add members"
      });
      return;
    }

    console.log("UserGroupsManagement: Current user ID:", session.user.id);
    
    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasAdminRole = userRoles?.some(r => r.role === 'admin') || false;
    
    if (!hasAdminRole) {
      console.error("UserGroupsManagement: User does not have admin role");
      toast.error("Permission denied", {
        description: "Only administrators can add group members. Please contact your administrator."
      });
      return;
    }

    console.log("UserGroupsManagement: Attempting to add member");

    // @ts-ignore - Table exists but types haven't regenerated yet
    const { error } = await (supabase as any)
      .from("user_group_members")
      .insert({
        group_id: selectedGroup.id,
        user_id: selectedUserId,
        added_by: session.user.id,
      });

    if (error) {
      console.error("UserGroupsManagement: Database error adding member:", {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      let errorDescription = error.message;
      let troubleshootingSteps = "";
      
      if (error.code === '23505') {
        errorDescription = "This user is already a member of this group.";
        troubleshootingSteps = "\n\nNo action needed - the user already has access.";
      } else if (error.code === "42501") {
        errorDescription = "Permission denied - you do not have the required admin privileges.";
        troubleshootingSteps = "\n\nTroubleshooting:\n1. Verify you have 'admin' role in user_roles table\n2. Contact your system administrator to grant admin access";
      } else if (error.message?.includes("violates row-level security")) {
        errorDescription = "Row-level security policy violation - access denied.";
        troubleshootingSteps = "\n\nEnsure you have admin role assigned in user_roles table.";
      } else if (error.code === "23503") {
        errorDescription = "Invalid user or group reference.";
        troubleshootingSteps = "\n\nThe user or group may have been deleted. Please refresh and try again.";
      } else if (error.message?.includes("does not exist") || error.code === 'PGRST116') {
        errorDescription = "user_group_members table not found - database migration may not have been applied.";
        troubleshootingSteps = "\n\nPlease contact your administrator to run database migrations.";
      }
      
      toast.error("Failed to add member", {
        description: `${errorDescription}${troubleshootingSteps}\n\nTechnical details: ${error.message}\nError code: ${error.code || 'N/A'}`,
        duration: 10000
      });
      console.error(error);
    } else {
      console.log("UserGroupsManagement: Member added successfully");
      toast.success("Member added successfully");
      setAddMemberDialogOpen(false);
      setSelectedUserId("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Groups
            </CardTitle>
            <CardDescription>
              Manage user groups for organizing users and permissions
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new user group for organizing users
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., IT Department, Management"
                  />
                </div>
                <div>
                  <Label htmlFor="groupDescription">Description (Optional)</Label>
                  <Textarea
                    id="groupDescription"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Describe the purpose of this group..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading groups...</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground">No groups created yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group);
                      setAddMemberDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to {selectedGroup?.name}</DialogTitle>
              <DialogDescription>
                Select a user to add to this group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
