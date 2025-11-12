import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileBarChart, TrendingUp, Package, Shield, Cpu, Users } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const Reports = () => {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [assetStats, setAssetStats] = useState<any>(null);
  const [licenseStats, setLicenseStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [priorityStats, setPriorityStats] = useState<any[]>([]);
  const [faultTypeStats, setFaultTypeStats] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    fetchAllReports();
  }, [navigate, selectedBranch]);

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
      .in("role", ["admin", "ceo", "support_staff"])
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You must be an admin, CEO, or support staff to access this page",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const fetchAllReports = async () => {
    setLoading(true);
    await Promise.all([
      fetchTicketStats(),
      fetchAssetStats(),
      fetchLicenseStats(),
      fetchUserStats(),
      fetchBranchStats(),
      fetchPriorityStats(),
      fetchFaultTypeStats(),
      fetchMonthlyTrend(),
    ]);
    setLoading(false);
  };

  const fetchTicketStats = async () => {
    let query = supabase.from("tickets").select("*", { count: "exact" });
    if (selectedBranch !== "all") {
      query = query.eq("branch", selectedBranch);
    }

    const { count: total } = await query;
    const { count: open } = await query.in("status", ["open", "in_progress"]);
    const { count: closed } = await query.eq("status", "closed");
    const { count: resolved } = await query.eq("status", "resolved");

    setTicketStats({ total: total || 0, open: open || 0, closed: closed || 0, resolved: resolved || 0 });
  };

  const fetchAssetStats = async () => {
    // Fetch from hardware_inventory (Microsoft 365 devices)
    const { count: total } = await supabase.from("hardware_inventory").select("*", { count: "exact", head: true });
    const { count: active } = await supabase.from("hardware_inventory").select("*", { count: "exact", head: true }).eq("status", "active");
    const { count: maintenance } = await supabase.from("hardware_inventory").select("*", { count: "exact", head: true }).eq("status", "maintenance");
    const { count: retired } = await supabase.from("hardware_inventory").select("*", { count: "exact", head: true }).eq("status", "retired");

    setAssetStats({ total: total || 0, active: active || 0, maintenance: maintenance || 0, retired: retired || 0 });
  };

  const fetchLicenseStats = async () => {
    // Fetch from licenses table (Microsoft 365 licenses)
    const { count: total } = await supabase.from("licenses").select("*", { count: "exact", head: true });
    const { data: licenses } = await supabase.from("licenses").select("total_seats, used_seats");
    
    const totalSeats = licenses?.reduce((acc, l) => acc + l.total_seats, 0) || 0;
    const usedSeats = licenses?.reduce((acc, l) => acc + l.used_seats, 0) || 0;

    setLicenseStats({ total: total || 0, totalSeats, usedSeats });
  };

  const fetchUserStats = async () => {
    // Fetch from directory_users (Microsoft 365 users)
    const { count: total } = await supabase.from("directory_users").select("*", { count: "exact", head: true });
    const { count: enabled } = await supabase.from("directory_users").select("*", { count: "exact", head: true }).eq("account_enabled", true);

    setUserStats({ total: total || 0, enabled: enabled || 0 });
  };

  const fetchBranchStats = async () => {
    const { data } = await supabase.from("tickets").select("branch");
    
    const branchCounts: Record<string, number> = {};
    data?.forEach((ticket) => {
      if (ticket.branch) {
        branchCounts[ticket.branch] = (branchCounts[ticket.branch] || 0) + 1;
      }
    });

    const stats = Object.entries(branchCounts).map(([branch, count]) => ({
      branch,
      tickets: count,
    }));

    setBranchStats(stats);
  };

  const fetchPriorityStats = async () => {
    let query = supabase.from("tickets").select("priority");
    if (selectedBranch !== "all") {
      query = query.eq("branch", selectedBranch);
    }

    const { data } = await query;
    
    const priorityCounts: Record<string, number> = {};
    data?.forEach((ticket) => {
      priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
    });

    const stats = Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority,
      value: count,
    }));

    setPriorityStats(stats);
  };

  const fetchFaultTypeStats = async () => {
    let query = supabase.from("tickets").select("fault_type");
    if (selectedBranch !== "all") {
      query = query.eq("branch", selectedBranch);
    }

    const { data } = await query;
    
    const faultCounts: Record<string, number> = {};
    data?.forEach((ticket) => {
      if (ticket.fault_type) {
        faultCounts[ticket.fault_type] = (faultCounts[ticket.fault_type] || 0) + 1;
      }
    });

    const stats = Object.entries(faultCounts).map(([type, count]) => ({
      name: type,
      value: count,
    }));

    setFaultTypeStats(stats);
  };

  const fetchMonthlyTrend = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("created_at, status")
      .order("created_at", { ascending: true });

    const monthlyData: Record<string, { month: string; created: number; closed: number }> = {};

    data?.forEach((ticket) => {
      const date = new Date(ticket.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, created: 0, closed: 0 };
      }

      monthlyData[monthKey].created += 1;
      if (ticket.status === "closed") {
        monthlyData[monthKey].closed += 1;
      }
    });

    const trend = Object.values(monthlyData).slice(-6);
    setMonthlyTrend(trend);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileBarChart className="w-8 h-8" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">Comprehensive IT infrastructure insights</p>
          </div>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="DBN">Durban (DBN)</SelectItem>
              <SelectItem value="CPT">Cape Town (CPT)</SelectItem>
              <SelectItem value="PE">Port Elizabeth (PE)</SelectItem>
              <SelectItem value="JHB">Johannesburg (JHB)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ticketStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {ticketStats?.open || 0} open
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assetStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {assetStats?.active || 0} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">
                    M365 Defender
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Resource Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68%</div>
                  <p className="text-xs text-muted-foreground">
                    RAM across devices
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Trends (Last 6 Months)</CardTitle>
                  <CardDescription>Created vs Closed tickets over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke="#8884d8" strokeWidth={2} name="Created" />
                      <Line type="monotone" dataKey="closed" stroke="#82ca9d" strokeWidth={2} name="Closed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Branch</CardTitle>
                  <CardDescription>Distribution across all locations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="branch" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tickets" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Priority</CardTitle>
                  <CardDescription>Distribution of ticket urgency levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Fault Type</CardTitle>
                  <CardDescription>Most common issues reported</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={faultTypeStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Statistics</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-blue-600">{ticketStats?.total || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Tickets</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-orange-600">{ticketStats?.open || 0}</span>
                    <span className="text-sm text-muted-foreground">Open/In Progress</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-green-600">{ticketStats?.resolved || 0}</span>
                    <span className="text-sm text-muted-foreground">Resolved</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gray-600">{ticketStats?.closed || 0}</span>
                    <span className="text-sm text-muted-foreground">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Status Distribution</CardTitle>
                  <CardDescription>Current state of all assets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Active", value: assetStats?.active || 0 },
                          { name: "Maintenance", value: assetStats?.maintenance || 0 },
                          { name: "Retired", value: assetStats?.retired || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Summary</CardTitle>
                  <CardDescription>Quick overview of asset inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Assets</span>
                      <span className="text-2xl font-bold">{assetStats?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">Active</span>
                      <span className="text-xl font-semibold text-green-600">{assetStats?.active || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-600">Under Maintenance</span>
                      <span className="text-xl font-semibold text-orange-600">{assetStats?.maintenance || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Retired</span>
                      <span className="text-xl font-semibold text-gray-600">{assetStats?.retired || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hardware Inventory (Microsoft 365)</CardTitle>
                <CardDescription>Devices synced from Microsoft 365</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold">{assetStats?.total || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Devices</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold text-green-600">{assetStats?.active || 0}</span>
                    <span className="text-sm text-muted-foreground">Active Devices</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold text-orange-600">{assetStats?.maintenance || 0}</span>
                    <span className="text-sm text-muted-foreground">In Maintenance</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="licenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>License Overview (Microsoft 365)</CardTitle>
                <CardDescription>License usage and allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold">{licenseStats?.total || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Licenses</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold text-blue-600">{licenseStats?.totalSeats || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Seats</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold text-green-600">{licenseStats?.usedSeats || 0}</span>
                    <span className="text-sm text-muted-foreground">Used Seats</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>License Utilization</CardTitle>
                <CardDescription>Seat usage efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Used Seats", value: licenseStats?.usedSeats || 0 },
                        { name: "Available Seats", value: (licenseStats?.totalSeats || 0) - (licenseStats?.usedSeats || 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#0088FE" />
                      <Cell fill="#00C49F" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Directory Users (Microsoft 365)</CardTitle>
                <CardDescription>User accounts synced from Microsoft 365</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold">{userStats?.total || 0}</span>
                    <span className="text-sm text-muted-foreground">Total Users</span>
                  </div>
                  <div className="flex flex-col p-3 border rounded-lg">
                    <span className="text-2xl font-bold text-green-600">{userStats?.enabled || 0}</span>
                    <span className="text-sm text-muted-foreground">Enabled Accounts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Account Status</CardTitle>
                <CardDescription>Active vs inactive accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Enabled", value: userStats?.enabled || 0 },
                        { name: "Disabled", value: (userStats?.total || 0) - (userStats?.enabled || 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#82CA9D" />
                      <Cell fill="#FF8042" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Branch Performance Comparison</CardTitle>
                <CardDescription>Tickets and resources across locations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={branchStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branch" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="#8884d8" name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Branch Details</CardTitle>
                  <CardDescription>Key metrics per location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {branchStats.map((branch) => (
                      <div key={branch.branch} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{branch.branch}</p>
                          <p className="text-sm text-muted-foreground">{branch.tickets} tickets</p>
                        </div>
                      </div>
                    ))}
                    {branchStats.length === 0 && (
                      <p className="text-sm text-muted-foreground">No branch data available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Providers</CardTitle>
                  <CardDescription>IT infrastructure partners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Qwerti</span>
                      <span className="text-sm text-muted-foreground">RDP Server Management</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Armata</span>
                      <span className="text-sm text-muted-foreground">Firewall & Security</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Braintree</span>
                      <span className="text-sm text-muted-foreground">365 Licenses</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Nymbis Cloud</span>
                      <span className="text-sm text-muted-foreground">Private Cloud</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">ZeroBitOne</span>
                      <span className="text-sm text-muted-foreground">IT Support</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Vox</span>
                      <span className="text-sm text-muted-foreground">Internet & VOIP</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
