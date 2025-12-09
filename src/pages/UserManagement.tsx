import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { CSVUserImporter } from "@/components/CSVUserImporter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Upload, History, Settings } from "lucide-react";
import { toast } from "sonner";

interface MasterUser {
  id: string;
  email: string;
  display_name: string | null;
  job_title: string | null;
  department: string | null;
  vpn_username: string | null;
  rdp_username: string | null;
  is_active: boolean;
  source: string;
  imported_at: string | null;
  created_at: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    csvImported: 0,
    manualAdded: 0
  });

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      const adminStatus = !!roles;
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        toast.error("Access denied. Admin role required.");
        navigate("/dashboard");
        return;
      }

      await fetchMasterUsers();
      await fetchStats();
    } catch (error) {
      console.error("Error checking admin role:", error);
      toast.error("Error checking permissions");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("master_user_list")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching master users:", error);
        toast.error("Failed to load users");
        return;
      }

      setMasterUsers(data || []);
    } catch (error) {
      console.error("Error fetching master users:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from("master_user_list")
        .select("*", { count: "exact", head: true });

      const { count: activeCount } = await supabase
        .from("master_user_list")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: csvCount } = await supabase
        .from("master_user_list")
        .select("*", { count: "exact", head: true })
        .eq("source", "csv_import");

      const { count: manualCount } = await supabase
        .from("master_user_list")
        .select("*", { count: "exact", head: true })
        .eq("source", "manual");

      setStats({
        totalUsers: totalCount || 0,
        activeUsers: activeCount || 0,
        csvImported: csvCount || 0,
        manualAdded: manualCount || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage the master user list, import users from CSV, and track device assignments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">CSV Imported</CardTitle>
              <Upload className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.csvImported}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Manual Added</CardTitle>
              <Settings className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.manualAdded}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="import" className="w-full">
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Master User List ({masterUsers.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Import History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            <CSVUserImporter />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Master User List</CardTitle>
                <CardDescription>
                  Users imported from CSV or added manually. This is the source of truth for who should be in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {masterUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No users yet. Import a CSV file to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {masterUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {user.display_name || "Unknown"}
                            </h3>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {user.source === 'csv_import' ? 'CSV' : user.source}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.job_title && (
                            <p className="text-xs text-muted-foreground">{user.job_title}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                          {user.vpn_username && (
                            <div>VPN: {user.vpn_username}</div>
                          )}
                          {user.rdp_username && (
                            <div>RDP: {user.rdp_username}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>
                  History of CSV imports and user additions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Import history tracking will be added in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserManagement;
