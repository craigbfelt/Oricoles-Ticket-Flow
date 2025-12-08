import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { CopilotPrompt } from "@/components/CopilotPrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Package, AlertCircle, CheckCircle, Monitor, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface DirectoryUser {
  id: string;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  account_enabled: boolean | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    totalAssets: 0,
    activeAssets: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminRole(session.user.id);
      }
    });

    fetchDashboardData();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const adminStatus = !!roles;
    setIsAdmin(adminStatus);

    if (adminStatus) {
      fetchDirectoryUsers();
    }
  };

  const fetchDirectoryUsers = async () => {
    const { data, error } = await supabase
      .from("directory_users")
      .select("id, display_name, email, job_title, account_enabled")
      .order("display_name");

    if (!error && data) {
      setDirectoryUsers(data);
    }
  };

  const fetchDashboardData = async () => {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    const { count: totalTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true });

    const { count: openTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]);

    // Only fetch assets if admin
    let totalAssets = 0;
    let activeAssets = 0;
    
    if (isAdmin) {
      const { count: totalCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true });

      const { count: activeCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      totalAssets = totalCount || 0;
      activeAssets = activeCount || 0;
    }

    setStats({
      totalTickets: totalTickets || 0,
      openTickets: openTickets || 0,
      totalAssets,
      activeAssets,
    });

    setRecentTickets(tickets || []);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-status-open",
      in_progress: "bg-status-in-progress",
      pending: "bg-status-pending",
      resolved: "bg-status-resolved",
      closed: "bg-status-closed",
    };

    return (
      <Badge className={`${colors[status]} text-white`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 w-full">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Oricol Helpdesk</p>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTickets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAssets}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users">Users ({directoryUsers.length})</TabsTrigger>
            )}
            <TabsTrigger value="copilot">GitHub Copilot</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <p className="text-muted-foreground">No tickets yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/tickets")}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Intune Users
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Click on a user to view their complete details including devices, credentials, and history
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      id="search-users"
                      name="search-users"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  {directoryUsers.length === 0 ? (
                    <p className="text-muted-foreground">No users synced from Intune yet</p>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {directoryUsers
                        .filter((user) => {
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase();
                          return (
                            user.display_name?.toLowerCase().includes(query) ||
                            user.email?.toLowerCase().includes(query) ||
                            user.job_title?.toLowerCase().includes(query)
                          );
                        })
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex flex-col items-center p-4 rounded-lg border border-border hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => navigate(`/user-details/${user.id}`)}
                          >
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                              <UserIcon className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center w-full">
                              <h3 className="font-semibold text-sm line-clamp-1">
                                {user.display_name || "Unknown"}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {user.email || "No email"}
                              </p>
                              {user.job_title && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {user.job_title}
                                </p>
                              )}
                              {user.account_enabled !== null && (
                                <Badge
                                  className={`mt-2 text-xs ${
                                    user.account_enabled ? "bg-green-500" : "bg-gray-500"
                                  }`}
                                >
                                  {user.account_enabled ? "Active" : "Disabled"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="copilot" className="space-y-6">
            <CopilotPrompt />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
