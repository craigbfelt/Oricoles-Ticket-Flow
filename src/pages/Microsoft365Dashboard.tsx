import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Laptop, Monitor, Key, Users, Shield, Activity, Cloud, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Microsoft365Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: Date | null;
    results: {
      devices: number;
      users: number;
      licenses: number;
      errors: string[];
    } | null;
  }>({
    lastSync: null,
    results: null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    const { data: hardwareData } = await supabase
      .from("hardware_inventory")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: licenseData } = await supabase
      .from("licenses")
      .select("*")
      .eq("vendor", "Microsoft")
      .order("created_at", { ascending: false });

    const { data: userData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setDevices(hardwareData || []);
    setLicenses(licenseData || []);
    setUsers(userData || []);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-microsoft-365");

      if (error) throw error;

      setSyncStatus({
        lastSync: new Date(),
        results: data?.results || null,
      });

      const hasErrors = data?.results?.errors?.length > 0;

      toast({
        title: hasErrors ? "Sync completed with errors" : "Sync completed",
        description: hasErrors
          ? `Synced ${data.results.devices} devices, ${data.results.users} users, ${data.results.licenses} licenses. ${data.results.errors.length} errors occurred.`
          : `Synced ${data.results.devices} devices, ${data.results.users} users, and ${data.results.licenses} licenses`,
        variant: hasErrors ? "destructive" : "default",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const laptops = devices.filter(d => d.device_type?.toLowerCase().includes("windows") || d.device_type?.toLowerCase().includes("laptop"));
  const thinClients = devices.filter(d => d.device_type?.toLowerCase().includes("thin") || d.notes?.toLowerCase().includes("thin client"));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Microsoft 365 Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your Microsoft 365 environment</p>
          </div>
          <Button onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Microsoft 365
          </Button>
        </div>

        {syncStatus.lastSync && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium">{syncStatus.lastSync.toLocaleString()}</span>
              </div>

              {syncStatus.results && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Devices Synced</span>
                      <Badge variant={syncStatus.results.devices > 0 ? "default" : "secondary"}>
                        {syncStatus.results.devices}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Users Synced</span>
                      <Badge variant={syncStatus.results.users > 0 ? "default" : "secondary"}>
                        {syncStatus.results.users}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Licenses Synced</span>
                      <Badge variant={syncStatus.results.licenses > 0 ? "default" : "secondary"}>
                        {syncStatus.results.licenses}
                      </Badge>
                    </div>
                  </div>

                  {syncStatus.results.errors.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-destructive">Errors ({syncStatus.results.errors.length})</h4>
                      <div className="space-y-1">
                        {syncStatus.results.errors.map((error, index) => (
                          <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">365 Licenses</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{licenses.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">365 Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">License Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {licenses.reduce((acc, l) => acc + (l.used_seats || 0), 0)} / {licenses.reduce((acc, l) => acc + (l.total_seats || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="laptops">Laptops</TabsTrigger>
            <TabsTrigger value="thin-clients">Thin Clients</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="intune">Intune</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="entra">Entra ID</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft 365 Inventory Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Laptop className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Laptops</p>
                      <p className="text-2xl font-bold">{laptops.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Monitor className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Thin Clients</p>
                      <p className="text-2xl font-bold">{thinClients.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Intune Endpoints</p>
                      <p className="text-2xl font-bold">{devices.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Cloud className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cloud Security</p>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="laptops">
            <Card>
              <CardHeader>
                <CardTitle>Laptop Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laptops.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.device_name}</TableCell>
                        <TableCell>{device.model || "N/A"}</TableCell>
                        <TableCell>{device.os} {device.os_version}</TableCell>
                        <TableCell>{device.last_seen ? new Date(device.last_seen).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={device.status === "active" ? "default" : "secondary"}>
                            {device.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="thin-clients">
            <Card>
              <CardHeader>
                <CardTitle>Thin Client Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thinClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No thin clients found
                        </TableCell>
                      </TableRow>
                    ) : (
                      thinClients.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.device_name}</TableCell>
                          <TableCell>{device.model || "N/A"}</TableCell>
                          <TableCell>{device.location || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={device.status === "active" ? "default" : "secondary"}>
                              {device.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="licenses">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft 365 Licenses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Seats</TableHead>
                      <TableHead>Used Seats</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-medium">{license.license_name}</TableCell>
                        <TableCell>{license.license_type}</TableCell>
                        <TableCell>{license.total_seats}</TableCell>
                        <TableCell>{license.used_seats}</TableCell>
                        <TableCell>{license.total_seats - license.used_seats}</TableCell>
                        <TableCell>
                          <Badge variant={license.status === "active" ? "default" : "secondary"}>
                            {license.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft 365 Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intune">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft Intune Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Managed Devices</p>
                      <p className="text-2xl font-bold">{devices.length}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Compliant Devices</p>
                      <p className="text-2xl font-bold">{devices.filter(d => d.status === "active").length}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Cloud Security</p>
                      <Badge variant="outline" className="mt-2">Microsoft Intune</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security & Antivirus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Microsoft Defender</h3>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Managed by Microsoft Intune - Real-time protection enabled
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Microsoft Secure Score</h3>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Security posture assessment and recommendations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entra">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft Entra ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Registered Devices</h3>
                      <Badge>{devices.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Devices registered in Microsoft Entra ID
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Entra ID Users</h3>
                      <Badge>{users.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Active users in Entra ID directory
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Entra ID Secure Score</h3>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Identity security posture assessment
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Microsoft365Dashboard;
