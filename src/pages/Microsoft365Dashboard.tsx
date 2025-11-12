import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Laptop, Monitor, Key, Users, Shield, Activity, Cloud, Lock, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContentSearchPanel from "@/components/ContentSearchPanel";

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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'device' | 'license' | 'user' | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

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
      .eq("deleted_manually", false)
      .order("created_at", { ascending: false });

    const { data: licenseData } = await supabase
      .from("licenses")
      .select("*")
      .eq("vendor", "Microsoft")
      .eq("deleted_manually", false)
      .order("created_at", { ascending: false });

    const { data: userData } = await supabase
      .from("directory_users" as any)
      .select("id, display_name, email, created_at, aad_id, user_principal_name, job_title, department, account_enabled")
      .eq("deleted_manually", false)
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

  const handleItemClick = (item: any, type: 'device' | 'license' | 'user') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setIsSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem || !selectedItemType) return;

    try {
      const table = selectedItemType === 'device' ? 'hardware_inventory' : 
                    selectedItemType === 'license' ? 'licenses' : 'directory_users';
      
      const { error } = await supabase
        .from(table as any)
        .update({ deleted_manually: true })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: "The item has been marked as deleted and will be skipped in future syncs",
      });

      setDeleteDialogOpen(false);
      setIsSheetOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveDuplicates = async (type: 'device' | 'license' | 'user') => {
    setIsRemoving(true);
    try {
      const functionName = type === 'device' ? 'remove_hardware_duplicates' :
                          type === 'license' ? 'remove_license_duplicates' : 'remove_user_duplicates';
      
      const { data, error } = await supabase.rpc(functionName as any);

      if (error) throw error;

      toast({
        title: "Duplicates removed",
        description: `Removed ${data || 0} duplicate records`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Laptop Devices</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveDuplicates('device')}
                  disabled={isRemoving}
                >
                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remove Duplicates
                </Button>
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
                      <TableRow 
                        key={device.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleItemClick(device, 'device')}
                      >
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Thin Client Devices</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveDuplicates('device')}
                  disabled={isRemoving}
                >
                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remove Duplicates
                </Button>
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
                        <TableRow 
                          key={device.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleItemClick(device, 'device')}
                        >
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Microsoft 365 Licenses</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveDuplicates('license')}
                  disabled={isRemoving}
                >
                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remove Duplicates
                </Button>
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
                      <TableRow 
                        key={license.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleItemClick(license, 'license')}
                      >
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Microsoft 365 Users</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemoveDuplicates('user')}
                  disabled={isRemoving}
                >
                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Remove Duplicates
                </Button>
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
                      <TableRow 
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleItemClick(user, 'user')}
                      >
                        <TableCell className="font-medium">{user.display_name || "N/A"}</TableCell>
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

          <TabsContent value="security" className="space-y-4">
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
            
            {isAdmin && <ContentSearchPanel />}
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

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {selectedItemType === 'device' ? 'Device Details' : 
                 selectedItemType === 'license' ? 'License Details' : 'User Details'}
              </SheetTitle>
              <SheetDescription>
                View and manage this {selectedItemType} record
              </SheetDescription>
            </SheetHeader>
            
            {selectedItem && (
              <div className="space-y-6 py-6">
                {selectedItemType === 'device' && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Device Name</h4>
                      <p className="text-sm">{selectedItem.device_name}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Model</h4>
                      <p className="text-sm">{selectedItem.model || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Manufacturer</h4>
                      <p className="text-sm">{selectedItem.manufacturer || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Serial Number</h4>
                      <p className="text-sm">{selectedItem.serial_number || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Operating System</h4>
                      <p className="text-sm">{selectedItem.os} {selectedItem.os_version}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Last Seen</h4>
                      <p className="text-sm">
                        {selectedItem.last_seen ? new Date(selectedItem.last_seen).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Status</h4>
                      <Badge variant={selectedItem.status === 'active' ? 'default' : 'secondary'}>
                        {selectedItem.status}
                      </Badge>
                    </div>
                    {selectedItem.notes && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
                        <p className="text-sm">{selectedItem.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedItemType === 'license' && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">License Name</h4>
                      <p className="text-sm">{selectedItem.license_name}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Type</h4>
                      <p className="text-sm">{selectedItem.license_type}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Vendor</h4>
                      <p className="text-sm">{selectedItem.vendor}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Total Seats</h4>
                      <p className="text-sm">{selectedItem.total_seats}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Used Seats</h4>
                      <p className="text-sm">{selectedItem.used_seats}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Available Seats</h4>
                      <p className="text-sm">{selectedItem.total_seats - selectedItem.used_seats}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Status</h4>
                      <Badge variant={selectedItem.status === 'active' ? 'default' : 'secondary'}>
                        {selectedItem.status}
                      </Badge>
                    </div>
                    {selectedItem.notes && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
                        <p className="text-sm">{selectedItem.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedItemType === 'user' && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Display Name</h4>
                      <p className="text-sm">{selectedItem.display_name || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Email</h4>
                      <p className="text-sm">{selectedItem.email}</p>
                    </div>
                    {selectedItem.user_principal_name && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">User Principal Name</h4>
                        <p className="text-sm">{selectedItem.user_principal_name}</p>
                      </div>
                    )}
                    {selectedItem.job_title && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Job Title</h4>
                        <p className="text-sm">{selectedItem.job_title}</p>
                      </div>
                    )}
                    {selectedItem.department && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Department</h4>
                        <p className="text-sm">{selectedItem.department}</p>
                      </div>
                    )}
                    {typeof selectedItem.account_enabled === 'boolean' && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Account Status</h4>
                        <Badge variant={selectedItem.account_enabled ? 'default' : 'secondary'}>
                          {selectedItem.account_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Created</h4>
                      <p className="text-sm">{new Date(selectedItem.created_at).toLocaleString()}</p>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedItemType === 'device' ? 'Device' : 
                            selectedItemType === 'license' ? 'License' : 'User'}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the item as manually deleted. It will be hidden from view and will not be updated 
                during future Microsoft 365 syncs. This action can be reversed by manually updating the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Microsoft365Dashboard;
