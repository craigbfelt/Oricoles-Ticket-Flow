import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Shield, UserCog, User as UserIcon, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
  assignedAssets: any[];
}

const Users = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>("");

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
    fetchAssets();
  }, [navigate]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id);

          const { data: assets } = await supabase
            .from("assets")
            .select("*")
            .eq("assigned_to", profile.user_id);

          return {
            ...profile,
            roles: roles?.map((r) => r.role) || [],
            assignedAssets: assets || [],
          };
        })
      );

      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .order("name");
    
    setAssets(data || []);
  };

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: role as "admin" | "support_staff" | "user" });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role added successfully",
      });
      fetchUsers();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as "admin" | "support_staff" | "user");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role removed successfully",
      });
      fetchUsers();
    }
  };

  const assignAssetToUser = async () => {
    if (!selectedUser || !selectedAsset) return;

    const { error } = await supabase
      .from("assets")
      .update({ assigned_to: selectedUser.user_id })
      .eq("id", selectedAsset);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign asset",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset assigned successfully",
      });
      setSelectedUser(null);
      setSelectedAsset("");
      fetchUsers();
      fetchAssets();
    }
  };

  const unassignAsset = async (assetId: string) => {
    const { error } = await supabase
      .from("assets")
      .update({ assigned_to: null })
      .eq("id", assetId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unassign asset",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset unassigned successfully",
      });
      fetchUsers();
      fetchAssets();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "support_staff":
        return <UserCog className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "support_staff":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UsersIcon className="w-8 h-8" />
              User Management
            </h1>
            <p className="text-muted-foreground">Manage users, roles, and asset assignments</p>
          </div>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="grid gap-6">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{user.full_name || "No Name"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Assign Asset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Asset to {user.full_name}</DialogTitle>
                          <DialogDescription>
                            Select an asset to assign to this user
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Select Asset</Label>
                            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an asset" />
                              </SelectTrigger>
                              <SelectContent>
                                {assets.map((asset) => (
                                  <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name} - {asset.asset_tag || "No tag"}
                                    {asset.assigned_to && " (Already assigned)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={assignAssetToUser} className="w-full">
                            Assign Asset
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Roles</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">No roles assigned</Badge>
                      ) : (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            className={`${getRoleBadgeColor(role)} text-white flex items-center gap-1`}
                          >
                            {getRoleIcon(role)}
                            {role}
                            <button
                              onClick={() => removeRole(user.user_id, role)}
                              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                            >
                              ×
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <Select onValueChange={(role) => addRole(user.user_id, role)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="support_staff">Support Staff</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Assigned Assets ({user.assignedAssets.length})</h3>
                    {user.assignedAssets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No assets assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {user.assignedAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {asset.asset_tag} - {asset.category}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unassignAsset(asset.id)}
                            >
                              Unassign
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Users;
