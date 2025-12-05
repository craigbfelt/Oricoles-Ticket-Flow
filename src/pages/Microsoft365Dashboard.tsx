import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import ContentSearchPanel from "@/components/ContentSearchPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, 
  Settings, 
  Monitor, 
  Users, 
  Key, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface SyncResult {
  devices?: { synced: number; errors: number; total: number };
  users?: { total: number };
  licenses?: { total: number };
}

interface ConnectionStatus {
  connected: boolean;
  organization?: {
    displayName: string;
    id: string;
  };
  error?: string;
}

interface DiagnosticStep {
  step: string;
  status: 'success' | 'error' | 'warning' | 'skipped';
  message: string;
  details?: string;
}

interface DiagnosticResult {
  success: boolean;
  steps: DiagnosticStep[];
  summary: string;
}

const Microsoft365Dashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roles);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'test_connection' },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        setConnectionStatus({
          connected: false,
          error: data.error || 'Connection test failed',
        });
        toast.error(data.error || 'Connection test failed');
      } else {
        setConnectionStatus({
          connected: true,
          organization: data.organization,
        });
        toast.success(`Connected to ${data.organization?.displayName || 'Microsoft 365'}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setConnectionStatus({
        connected: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    setConnectionStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'diagnose_connection' },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle error responses from the edge function
      if (!data?.success && data?.error) {
        setConnectionStatus({
          connected: false,
          error: data.error,
        });
        toast.error(data.error);
        return;
      }

      if (data?.diagnostics) {
        setDiagnosticResult(data.diagnostics);
        if (data.diagnostics.success) {
          toast.success('Diagnostics completed successfully');
        } else {
          toast.error('Diagnostics found issues - see details below');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Diagnostics failed';
      setConnectionStatus({
        connected: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const syncDevices = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'sync_devices' },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        toast.error(data.error || 'Sync failed');
      } else {
        setSyncResult(data.results);
        setLastSyncTime(new Date().toISOString());
        const devices = data.results?.devices;
        if (devices) {
          toast.success(`Synced ${devices.synced} devices from Microsoft 365`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const fullSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'full_sync' },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        toast.error(data.error || 'Sync failed');
      } else {
        setSyncResult(data.results);
        setLastSyncTime(new Date().toISOString());
        toast.success('Full sync completed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Microsoft 365 Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your Microsoft 365 environment</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={runDiagnostics}
                disabled={isDiagnosing || isTesting || isSyncing}
              >
                {isDiagnosing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                Run Diagnostics
              </Button>
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting || isSyncing || isDiagnosing}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={fullSync}
                disabled={isSyncing || isTesting || isDiagnosing}
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Full Sync
              </Button>
            </div>
          )}
        </div>

        {/* Diagnostic Results Panel */}
        {diagnosticResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {diagnosticResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Connection Diagnostics
              </CardTitle>
              <CardDescription>{diagnosticResult.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnosticResult.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="mt-0.5">
                      {step.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {step.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                      {step.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {step.status === 'skipped' && <AlertCircle className="h-5 w-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{step.step}</span>
                        <Badge variant={
                          step.status === 'success' ? 'default' : 
                          step.status === 'error' ? 'destructive' : 
                          step.status === 'warning' ? 'secondary' : 'outline'
                        }>
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{step.message}</p>
                      {step.details && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {connectionStatus && (
          <Alert variant={connectionStatus.connected ? "default" : "destructive"}>
            {connectionStatus.connected ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {connectionStatus.connected ? 'Connected' : 'Connection Failed'}
            </AlertTitle>
            <AlertDescription>
              {connectionStatus.connected
                ? `Successfully connected to ${connectionStatus.organization?.displayName || 'Microsoft 365'}`
                : (
                  <div className="space-y-2">
                    <p>{connectionStatus.error}</p>
                    {connectionStatus.error?.includes('Missing environment variables') && (
                      <p className="text-sm">
                        <strong>Setup required:</strong> Configure the Microsoft 365 credentials (MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_SECRET) in Supabase Dashboard → Edge Functions → sync-microsoft-365 → Settings → Secrets. 
                        Click "Run Diagnostics" for detailed troubleshooting. See MICROSOFT_365_SETUP.md for setup instructions.
                      </p>
                    )}
                  </div>
                )}
            </AlertDescription>
          </Alert>
        )}

        {!connectionStatus && !diagnosticResult && !isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              To use Microsoft 365 integration, an administrator needs to configure the Microsoft 365 credentials
              (MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_SECRET) in Supabase Edge Functions environment variables. 
              See the .env.example file for details.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="security" disabled={!isAdmin}>Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devices</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncResult?.devices?.total || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncResult?.devices ? `${syncResult.devices.synced} synced` : 'Not synced'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncResult?.users?.total || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncResult?.users ? 'From Azure AD' : 'Not synced'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Licenses</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncResult?.licenses?.total || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncResult?.licenses ? 'Subscribed SKUs' : 'Not synced'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleDateString() : 'Never'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Sync data from your Microsoft 365 tenant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col"
                    onClick={syncDevices}
                    disabled={isSyncing || !isAdmin}
                  >
                    <Monitor className="h-6 w-6 mb-2" />
                    <span>Sync Devices</span>
                    <span className="text-xs text-muted-foreground">From Intune</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col"
                    onClick={() => {
                      supabase.functions.invoke('sync-microsoft-365', {
                        body: { action: 'sync_users' },
                      }).then(({ data, error }) => {
                        if (error || !data?.success) {
                          toast.error(data?.error || 'User sync failed');
                        } else {
                          toast.success(`Found ${data.results?.users?.total || 0} users`);
                        }
                      });
                    }}
                    disabled={isSyncing || !isAdmin}
                  >
                    <Users className="h-6 w-6 mb-2" />
                    <span>Sync Users</span>
                    <span className="text-xs text-muted-foreground">From Azure AD</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col"
                    onClick={() => {
                      supabase.functions.invoke('sync-microsoft-365', {
                        body: { action: 'sync_licenses' },
                      }).then(({ data, error }) => {
                        if (error || !data?.success) {
                          toast.error(data?.error || 'License sync failed');
                        } else {
                          toast.success(`Found ${data.results?.licenses?.total || 0} licenses`);
                        }
                      });
                    }}
                    disabled={isSyncing || !isAdmin}
                  >
                    <Key className="h-6 w-6 mb-2" />
                    <span>Sync Licenses</span>
                    <span className="text-xs text-muted-foreground">From M365</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {syncResult?.devices && syncResult.devices.errors > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sync Errors</AlertTitle>
                <AlertDescription>
                  {syncResult.devices.errors} device(s) failed to sync. Check the logs for details.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Managed Devices</CardTitle>
                <CardDescription>
                  Devices synced from Microsoft Intune / Endpoint Manager
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    View and manage synced devices in the Hardware Inventory page.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/hardware-inventory')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    Go to Hardware Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Security & Compliance</h2>
            </div>
            <ContentSearchPanel isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Microsoft365Dashboard;
