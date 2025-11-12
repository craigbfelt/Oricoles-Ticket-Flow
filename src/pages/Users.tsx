import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Search, Upload, Download, Save } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddStaffMemberDialog } from "@/components/AddStaffMemberDialog";
import { ManageLicensesDialog } from "@/components/ManageLicensesDialog";

interface DirectoryUser {
  id: string;
  aad_id: string | null;
  display_name: string | null;
  email: string | null;
  user_principal_name: string | null;
  job_title: string | null;
  department: string | null;
  account_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

interface VpnRdpUser {
  id: string;
  service_type: string;
  username: string;
  password: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  roles: string[];
  created_at: string;
  updated_at: string;
}

const Users = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [rdpUsers, setRdpUsers] = useState<VpnRdpUser[]>([]);
  const [vpnUsers, setVpnUsers] = useState<VpnRdpUser[]>([]);
  const [staffUsers, setStaffUsers] = useState<VpnRdpUser[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | VpnRdpUser | SystemUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userType, setUserType] = useState<"365" | "rdp" | "vpn" | "staff" | "system">("staff");
  const [globalSearch, setGlobalSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTab, setCurrentTab] = useState("system");
  const [editingSystemUser, setEditingSystemUser] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editRoles, setEditRoles] = useState<string[]>([]);

  useEffect(() => {
    checkAccess();
    fetchUsers();
    fetchVpnRdpUsers();
    fetchSystemUsers();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "support_staff"])
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You must be an admin or support staff to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("directory_users")
      .select("*")
      .order("display_name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch 365 users",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
  };

  const fetchVpnRdpUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vpn_rdp_credentials")
      .select("*")
      .order("username");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch VPN/RDP users",
        variant: "destructive",
      });
    } else {
      const allData = data || [];
      setRdpUsers(allData.filter(u => u.service_type === 'rdp'));
      setVpnUsers(allData.filter(u => u.service_type === 'vpn'));
      setStaffUsers(allData); // All VPN/RDP users are the most accurate staff list
    }
    setLoading(false);
  };

  const fetchSystemUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to fetch system users",
        variant: "destructive",
      });
      return;
    }

    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      (profilesData || []).map(async (profile) => {
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.user_id);

        return {
          ...profile,
          roles: rolesData?.map(r => r.role) || [],
        };
      })
    );

    setSystemUsers(usersWithRoles);
  };

  const handleUpdateSystemUser = async () => {
    if (!selectedUser || !('user_id' in selectedUser)) return;

    const systemUser = selectedUser as SystemUser;

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: editFullName })
      .eq("user_id", systemUser.user_id);

    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive",
      });
      return;
    }

    // Update roles - delete existing roles and insert new ones
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", systemUser.user_id);

    if (deleteError) {
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive",
      });
      return;
    }

    if (editRoles.length > 0) {
      const rolesToInsert = editRoles.map(role => ({
        user_id: systemUser.user_id,
        role: role,
      }));

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert(rolesToInsert);

      if (insertError) {
        toast({
          title: "Error",
          description: "Failed to assign user roles",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "User updated successfully",
    });

    setEditingSystemUser(false);
    fetchSystemUsers();
    setSheetOpen(false);
  };

  const handleEditSystemUser = (user: SystemUser) => {
    setEditFullName(user.full_name || "");
    setEditRoles(user.roles);
    setEditingSystemUser(true);
  };

  const toggleRole = (role: string) => {
    setEditRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleRowClick = (user: DirectoryUser | VpnRdpUser | SystemUser, type: "365" | "rdp" | "vpn" | "staff" | "system") => {
    setSelectedUser(user);
    setUserType(type);
    setSheetOpen(true);
  };

  const filterUsers = <T extends DirectoryUser | VpnRdpUser>(userList: T[], searchFields: (keyof T)[]): T[] => {
    if (!globalSearch) return userList;
    
    const searchLower = globalSearch.toLowerCase();
    return userList.filter(user => 
      searchFields.some(field => {
        const value = user[field];
        return value && String(value).toLowerCase().includes(searchLower);
      })
    );
  };

  const filtered365Users = filterUsers(users, ["display_name", "email", "job_title", "department"]);
  const filteredRdpUsers = filterUsers(rdpUsers, ["username", "email", "notes"]);
  const filteredVpnUsers = filterUsers(vpnUsers, ["username", "email", "notes"]);
  const filteredStaffUsers = filterUsers(staffUsers, ["username", "email", "notes"]);
  const filteredSystemUsers = filterUsers(systemUsers, ["full_name", "email"]);

  const downloadCSVTemplate = (type: string) => {
    let headers: string[];
    let example: string;
    
    if (type === '365') {
      headers = ['display_name', 'email', 'user_principal_name', 'job_title', 'department', 'account_enabled'];
      example = 'John Doe,john@example.com,john@example.com,Manager,IT,true';
    } else {
      headers = ['username', 'email', 'service_type', 'password', 'notes'];
      example = 'jdoe,john@example.com,rdp,SecurePass123,Sample notes';
    }
    
    const csv = headers.join(',') + '\n' + example;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_users_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Template downloaded" });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const usersToImport = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const user: any = {};
        headers.forEach((header, index) => {
          if (header === 'account_enabled') {
            user[header] = values[index] === 'true';
          } else {
            user[header] = values[index] || null;
          }
        });
        usersToImport.push(user);
      }

      const tableName = currentTab === '365' ? 'directory_users' : 'vpn_rdp_credentials';
      const { error } = await supabase.from(tableName).insert(usersToImport);
      
      if (error) {
        console.error('Error importing users:', error);
        toast({ title: "Failed to import users", variant: "destructive" });
      } else {
        toast({ title: `Imported ${usersToImport.length} users` });
        if (currentTab === '365') {
          fetchUsers();
        } else {
          fetchVpnRdpUsers();
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const m365Columns: Column<DirectoryUser>[] = [
    {
      key: "display_name",
      label: "Name",
      sortable: true,
      filterPlaceholder: "Filter by name...",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterPlaceholder: "Filter by email...",
    },
    {
      key: "job_title",
      label: "Job Title",
      sortable: true,
      filterPlaceholder: "Filter by job title...",
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      filterPlaceholder: "Filter by department...",
    },
    {
      key: "account_enabled",
      label: "Status",
      sortable: true,
      render: (user) => (
        <Badge variant={user.account_enabled ? "default" : "secondary"}>
          {user.account_enabled ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const vpnRdpColumns: Column<VpnRdpUser>[] = [
    {
      key: "username",
      label: "Username",
      sortable: true,
      filterPlaceholder: "Filter by username...",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterPlaceholder: "Filter by email...",
    },
    {
      key: "service_type",
      label: "Service Type",
      sortable: true,
      render: (user) => (
        <Badge variant="outline">
          {user.service_type?.toUpperCase() || 'N/A'}
        </Badge>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      sortable: false,
    },
  ];

  const systemUserColumns: Column<SystemUser>[] = [
    {
      key: "full_name",
      label: "Full Name",
      sortable: true,
      filterPlaceholder: "Filter by name...",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterPlaceholder: "Filter by email...",
    },
    {
      key: "roles",
      label: "Roles",
      sortable: false,
      render: (user) => (
        <div className="flex gap-1 flex-wrap">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                {role}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">No roles</Badge>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (user) => new Date(user.created_at).toLocaleDateString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UsersIcon className="w-8 h-8" />
              Users
            </h1>
            <p className="text-muted-foreground">View all users across different systems</p>
          </div>
          <div className="flex gap-2">
            <ManageLicensesDialog onUpdate={() => {
              fetchUsers();
              fetchVpnRdpUsers();
            }} />
            <AddStaffMemberDialog onSuccess={() => {
              fetchUsers();
              fetchVpnRdpUsers();
            }} />
            <Button variant="outline" onClick={() => downloadCSVTemplate(currentTab)}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </div>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all user categories..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="system">
                  System Users {globalSearch && `(${filteredSystemUsers.length})`}
                </TabsTrigger>
                <TabsTrigger value="staff">
                  Staff Users {globalSearch && `(${filteredStaffUsers.length})`}
                </TabsTrigger>
                <TabsTrigger value="365">
                  365 Users {globalSearch && `(${filtered365Users.length})`}
                </TabsTrigger>
                <TabsTrigger value="rdp">
                  RDP Users {globalSearch && `(${filteredRdpUsers.length})`}
                </TabsTrigger>
                <TabsTrigger value="vpn">
                  VPN Users {globalSearch && `(${filteredVpnUsers.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">System Login Users</h2>
                  <p className="text-sm text-muted-foreground">Users who can log into the helpdesk system</p>
                </div>
                <DataTable
                  data={filteredSystemUsers}
                  columns={systemUserColumns}
                  onRowClick={(user) => handleRowClick(user, "system")}
                  searchKeys={["full_name", "email"]}
                />
              </TabsContent>

              <TabsContent value="staff" className="mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Staff Users (Most Accurate)</h2>
                  <p className="text-sm text-muted-foreground">Combined list from Forticlient and RDP users</p>
                </div>
                <DataTable
                  data={filteredStaffUsers}
                  columns={vpnRdpColumns}
                  onRowClick={(user) => handleRowClick(user, "staff")}
                  searchKeys={["username", "email", "notes"]}
                />
              </TabsContent>

              <TabsContent value="365" className="mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Microsoft 365 Users</h2>
                  <p className="text-sm text-muted-foreground">Note: May not be accurate when staff leave</p>
                </div>
                <DataTable
                  data={filtered365Users}
                  columns={m365Columns}
                  onRowClick={(user) => handleRowClick(user, "365")}
                  searchKeys={["display_name", "email", "job_title", "department"]}
                />
              </TabsContent>

              <TabsContent value="rdp" className="mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">RDP Users</h2>
                  <p className="text-sm text-muted-foreground">Users with RDP access credentials</p>
                </div>
                <DataTable
                  data={filteredRdpUsers}
                  columns={vpnRdpColumns}
                  onRowClick={(user) => handleRowClick(user, "rdp")}
                  searchKeys={["username", "email", "notes"]}
                />
              </TabsContent>

              <TabsContent value="vpn" className="mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">VPN Users</h2>
                  <p className="text-sm text-muted-foreground">Users with VPN access credentials</p>
                </div>
                <DataTable
                  data={filteredVpnUsers}
                  columns={vpnRdpColumns}
                  onRowClick={(user) => handleRowClick(user, "vpn")}
                  searchKeys={["username", "email", "notes"]}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>User Details</SheetTitle>
              <SheetDescription>
                Information from Microsoft 365 directory
              </SheetDescription>
            </SheetHeader>

            {selectedUser && (
              <div className="space-y-6 mt-6">
                {userType === "365" && "display_name" in selectedUser ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Display Name</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.display_name || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">User Principal Name</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.user_principal_name || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Job Title</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.job_title || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Department</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.department || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Account Status</label>
                      <div>
                        <Badge variant={selectedUser.account_enabled ? "default" : "secondary"}>
                          {selectedUser.account_enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Azure AD ID</label>
                      <p className="text-sm text-muted-foreground font-mono break-all">
                        {selectedUser.aad_id || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Synced</label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUser.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : "username" in selectedUser ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.username}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service Type</label>
                      <Badge variant="outline">
                        {selectedUser.service_type?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Password</label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedUser.password}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.notes || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Created At</label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUser.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Updated</label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUser.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </>
                ) : userType === "system" && "user_id" in selectedUser ? (
                  <>
                    {!editingSystemUser ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Full Name</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedUser.full_name || "N/A"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedUser.email || "N/A"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Roles</label>
                          <div className="flex gap-1 flex-wrap">
                            {selectedUser.roles.length > 0 ? (
                              selectedUser.roles.map((role) => (
                                <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">No roles</Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">User ID</label>
                          <p className="text-sm text-muted-foreground font-mono break-all">
                            {selectedUser.user_id}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Created</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedUser.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Last Updated</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedUser.updated_at).toLocaleString()}
                          </p>
                        </div>

                        <Button 
                          onClick={() => handleEditSystemUser(selectedUser)}
                          className="w-full"
                        >
                          Edit User
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="edit-full-name">Full Name</Label>
                          <Input
                            id="edit-full-name"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="Enter full name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Email (Read-only)</Label>
                          <p className="text-sm text-muted-foreground">
                            {selectedUser.email || "N/A"}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label>Roles</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="role-admin"
                                checked={editRoles.includes('admin')}
                                onCheckedChange={() => toggleRole('admin')}
                              />
                              <label
                                htmlFor="role-admin"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Admin
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="role-support-staff"
                                checked={editRoles.includes('support_staff')}
                                onCheckedChange={() => toggleRole('support_staff')}
                              />
                              <label
                                htmlFor="role-support-staff"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Support Staff
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="role-user"
                                checked={editRoles.includes('user')}
                                onCheckedChange={() => toggleRole('user')}
                              />
                              <label
                                htmlFor="role-user"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                User
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleUpdateSystemUser}
                            className="flex-1"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => setEditingSystemUser(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default Users;
