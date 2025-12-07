import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import ContentSearchPanel from "@/components/ContentSearchPanel";
import { DataTable, type Column } from "@/components/DataTable";
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
  Shield,
  Building2,
  FileCheck,
  Lock,
  Users2,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

/**
 * Check if an error indicates an edge function deployment issue
 * This happens when the function can't be reached due to CORS or network issues
 */
function isEdgeFunctionDeploymentError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  const errorName = err?.name || '';
  const errorMessage = err?.message || '';
  
  // FunctionsFetchError is the specific error type thrown by Supabase client
  // when it can't reach the edge function (CORS, not deployed, etc.)
  return errorName === 'FunctionsFetchError' || 
         errorMessage.includes('Failed to send a request to the Edge Function');
}

/**
 * Helper to get a user-friendly error message from an edge function error
 */
function getEdgeFunctionErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  const err = error as { name?: string; message?: string };
  const errorMessage = err?.message || '';
  
  // Check for deployment/network issues
  if (isEdgeFunctionDeploymentError(error)) {
    return 'Unable to reach the Microsoft 365 sync function. The Edge Function may not be deployed yet. ' +
           'Please run the "Deploy All Edge Functions" workflow from GitHub Actions, or check the Supabase Dashboard.';
  }
  
  return errorMessage || 'An error occurred while calling the Edge Function';
}

interface SyncResult {
  devices?: { synced: number; errors: number; total: number };
  users?: { synced: number; errors: number; total: number };
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

interface DirectoryUser {
  id: string;
  aad_id: string | null;
  display_name: string | null;
  email: string | null;
  user_principal_name: string | null;
  job_title: string | null;
  department: string | null;
  account_enabled: boolean | null;
  updated_at: string;
}

interface M365Device {
  id: string;
  device_name: string | null;
  device_type: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  os: string | null;
  os_version: string | null;
  status: string | null;
  m365_device_id: string | null;
  m365_user_principal_name: string | null;
  m365_last_sync: string | null;
}

interface SecureScore {
  currentScore: number;
  maxScore: number;
  averageComparativeScore: number;
  controlScores: Array<{
    controlName: string;
    score: number;
    description: string;
  }>;
}

interface CompliancePolicy {
  id: string;
  displayName: string;
  description: string;
  lastModifiedDateTime: string;
  assignments: number;
}

interface ConditionalAccessPolicy {
  id: string;
  displayName: string;
  state: string;
  createdDateTime: string;
  modifiedDateTime: string;
}

interface EntraGroup {
  id: string;
  displayName: string;
  description: string;
  groupTypes: string[];
  membershipRule: string | null;
  memberCount: number;
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
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [m365Devices, setM365Devices] = useState<M365Device[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [secureScore, setSecureScore] = useState<SecureScore | null>(null);
  const [compliancePolicies, setCompliancePolicies] = useState<CompliancePolicy[]>([]);
  const [conditionalAccessPolicies, setConditionalAccessPolicies] = useState<ConditionalAccessPolicy[]>([]);
  const [entraGroups, setEntraGroups] = useState<EntraGroup[]>([]);

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

  // Fetch directory users from database
  const fetchDirectoryUsers = async () => {
    const { data, error } = await supabase
      .from("directory_users")
      .select("*")
      .order("display_name");

    if (!error && data) {
      setDirectoryUsers(data);
    }
  };

  // Fetch M365 devices from database
  const fetchM365Devices = async () => {
    const { data, error } = await supabase
      .from("hardware_inventory")
      .select("*")
      .eq("synced_from_m365", true)
      .order("device_name");

    if (!error && data) {
      setM365Devices(data);
    }
  };

  // Fetch secure score from Microsoft Graph
  const fetchSecureScoreData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'get_secure_score' },
      });

      if (!error && data?.success && data?.data) {
        setSecureScore(data.data);
      }
    } catch (err) {
      console.error('Error fetching secure score:', err);
    }
  };

  // Fetch compliance policies from Microsoft Graph
  const fetchCompliancePoliciesData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'get_compliance_policies' },
      });

      if (!error && data?.success && data?.data) {
        setCompliancePolicies(data.data);
      }
    } catch (err) {
      console.error('Error fetching compliance policies:', err);
    }
  };

  // Fetch conditional access policies from Microsoft Graph
  const fetchConditionalAccessPoliciesData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'get_conditional_access_policies' },
      });

      if (!error && data?.success && data?.data) {
        setConditionalAccessPolicies(data.data);
      }
    } catch (err) {
      console.error('Error fetching conditional access policies:', err);
    }
  };

  // Fetch Entra ID groups from Microsoft Graph
  const fetchEntraGroupsData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'get_entra_groups' },
      });

      if (!error && data?.success && data?.data) {
        setEntraGroups(data.data);
      }
    } catch (err) {
      console.error('Error fetching Entra groups:', err);
    }
  };

  // Load all data when admin status is confirmed
  useEffect(() => {
    if (isAdmin) {
      setIsLoadingData(true);
      Promise.all([
        fetchDirectoryUsers(),
        fetchM365Devices(),
        fetchSecureScoreData(),
        fetchCompliancePoliciesData(),
        fetchConditionalAccessPoliciesData(),
        fetchEntraGroupsData(),
      ]).finally(() => setIsLoadingData(false));
    }
  }, [isAdmin]);

  const testConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-microsoft-365', {
        body: { action: 'test_connection' },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        setConnectionStatus({
          connected: false,
          error: data?.error || 'Connection test failed',
        });
        toast.error(data?.error || 'Connection test failed');
      } else {
        setConnectionStatus({
          connected: true,
          organization: data.organization,
        });
        toast.success(`Connected to ${data.organization?.displayName || 'Microsoft 365'}`);
      }
    } catch (err) {
      const errorMessage = getEdgeFunctionErrorMessage(err);
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
        throw error;
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
      const errorMessage = getEdgeFunctionErrorMessage(err);
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
        throw error;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Sync failed');
      } else {
        setSyncResult(data.results);
        setLastSyncTime(new Date().toISOString());
        const devices = data.results?.devices;
        if (devices) {
          toast.success(`Synced ${devices.synced} devices from Microsoft 365`);
        }
      }
    } catch (err) {
      const errorMessage = getEdgeFunctionErrorMessage(err);
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
        throw error;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Sync failed');
      } else {
        setSyncResult(data.results);
        setLastSyncTime(new Date().toISOString());
        toast.success('Full sync completed');
      }
    } catch (err) {
      const errorMessage = getEdgeFunctionErrorMessage(err);
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
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="devices">Intune Devices</TabsTrigger>
            <TabsTrigger value="entra">Entra ID</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="secure-score">Secure Score</TabsTrigger>
            <TabsTrigger value="security" disabled={!isAdmin}>eDiscovery</TabsTrigger>
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
                    {m365Devices.length || syncResult?.devices?.total || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncResult?.devices ? `${syncResult.devices.synced} synced` : m365Devices.length > 0 ? 'From Intune' : 'Not synced'}
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
                    {directoryUsers.length || syncResult?.users?.total || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncResult?.users ? `${syncResult.users.synced} synced to directory` : directoryUsers.length > 0 ? 'From Azure AD' : 'Not synced'}
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
                          const users = data.results?.users;
                          toast.success(`Synced ${users?.synced || 0} of ${users?.total || 0} users to directory`);
                          fetchDirectoryUsers();
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

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Azure AD Users
                    </CardTitle>
                    <CardDescription>
                      Users synced from Microsoft Azure Active Directory
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      supabase.functions.invoke('sync-microsoft-365', {
                        body: { action: 'sync_users' },
                      }).then(({ data, error }) => {
                        if (error || !data?.success) {
                          toast.error(data?.error || 'User sync failed');
                        } else {
                          const users = data.results?.users;
                          toast.success(`Synced ${users?.synced || 0} of ${users?.total || 0} users`);
                          fetchDirectoryUsers();
                        }
                      });
                    }}
                    disabled={isSyncing || !isAdmin}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Users
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : directoryUsers.length > 0 ? (
                  <DataTable
                    data={directoryUsers}
                    columns={[
                      { key: "display_name", label: "Name", sortable: true },
                      { key: "email", label: "Email", sortable: true },
                      { key: "job_title", label: "Job Title", sortable: true },
                      { key: "department", label: "Department", sortable: true },
                      { 
                        key: "account_enabled", 
                        label: "Status", 
                        sortable: true,
                        render: (value) => (
                          <Badge variant={value ? "default" : "secondary"}>
                            {value ? "Active" : "Disabled"}
                          </Badge>
                        )
                      },
                    ] as Column<DirectoryUser>[]}
                    searchKeys={["display_name", "email", "department"]}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No users synced yet</p>
                    <p className="text-sm mb-4">Click "Sync Users" to pull data from Azure AD</p>
                    <div className="text-xs bg-muted p-4 rounded-lg max-w-2xl mx-auto text-left space-y-2">
                      <p className="font-medium">Setup Checklist:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Ensure Microsoft 365 credentials are configured in Supabase Edge Functions (Settings → Secrets)</li>
                        <li>Deploy the sync-microsoft-365 Edge Function via GitHub Actions</li>
                        <li>Click "Test Connection" above to verify the setup</li>
                        <li>Run "Sync Users" to import user data from Azure AD</li>
                      </ol>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Intune Managed Devices
                    </CardTitle>
                    <CardDescription>
                      Devices synced from Microsoft Intune / Endpoint Manager
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={syncDevices}
                    disabled={isSyncing || !isAdmin}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Devices
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : m365Devices.length > 0 ? (
                  <DataTable
                    data={m365Devices}
                    columns={[
                      { key: "device_name", label: "Device Name", sortable: true },
                      { key: "device_type", label: "Type", sortable: true },
                      { key: "os", label: "OS", sortable: true },
                      { key: "manufacturer", label: "Manufacturer", sortable: true },
                      { key: "model", label: "Model", sortable: true },
                      { key: "m365_user_principal_name", label: "User", sortable: true },
                      { 
                        key: "status", 
                        label: "Status", 
                        sortable: true,
                        render: (value) => (
                          <Badge variant={value === "active" ? "default" : "secondary"}>
                            {value || "Unknown"}
                          </Badge>
                        )
                      },
                    ] as Column<M365Device>[]}
                    searchKeys={["device_name", "os", "manufacturer", "m365_user_principal_name"]}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No devices synced yet</p>
                    <p className="text-sm mb-4">Click "Sync Devices" to pull data from Intune</p>
                    <div className="text-xs bg-muted p-4 rounded-lg max-w-2xl mx-auto text-left space-y-2">
                      <p className="font-medium">Setup Checklist:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Ensure Microsoft 365 credentials are configured in Supabase Edge Functions</li>
                        <li>Verify the sync-microsoft-365 Edge Function is deployed</li>
                        <li>Ensure your Azure AD app has "DeviceManagementManagedDevices.Read.All" permission</li>
                        <li>Run "Test Connection" to verify your setup</li>
                        <li>Click "Sync Devices" to import device data from Intune</li>
                      </ol>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entra" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Entra ID Groups
                    </CardTitle>
                    <CardDescription>
                      Security and Microsoft 365 groups from Entra ID (Azure AD)
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchEntraGroupsData();
                      toast.success('Fetching Entra ID groups...');
                    }}
                    disabled={!isAdmin}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Groups
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : entraGroups.length > 0 ? (
                  <DataTable
                    data={entraGroups}
                    columns={[
                      { key: "displayName", label: "Group Name", sortable: true },
                      { key: "description", label: "Description", sortable: false },
                      { 
                        key: "groupTypes", 
                        label: "Type", 
                        sortable: false,
                        render: (value: string[]) => (
                          <Badge variant="outline">
                            {value?.includes('Unified') ? 'M365 Group' : 'Security'}
                          </Badge>
                        )
                      },
                      { 
                        key: "membershipRule", 
                        label: "Membership", 
                        sortable: false,
                        render: (value) => (
                          <Badge variant="secondary">
                            {value ? 'Dynamic' : 'Assigned'}
                          </Badge>
                        )
                      },
                    ] as Column<EntraGroup>[]}
                    searchKeys={["displayName", "description"]}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No groups found. Click "Refresh Groups" to reload.</p>
                    <p className="text-xs mt-2">Requires Group.Read.All permission</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        Compliance Policies
                      </CardTitle>
                      <CardDescription>
                        Intune device compliance policies
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchCompliancePoliciesData();
                        toast.success('Fetching compliance policies...');
                      }}
                      disabled={!isAdmin}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : compliancePolicies.length > 0 ? (
                    <div className="space-y-2">
                      {compliancePolicies.map((policy) => (
                        <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{policy.displayName}</p>
                            <p className="text-xs text-muted-foreground">{policy.description || 'No description'}</p>
                          </div>
                          <Badge variant="outline">{policy.assignments} assignments</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No compliance policies found</p>
                      <p className="text-xs mt-1">Requires DeviceManagementConfiguration.Read.All</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Conditional Access
                      </CardTitle>
                      <CardDescription>
                        Entra ID Conditional Access policies
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchConditionalAccessPoliciesData();
                        toast.success('Fetching conditional access policies...');
                      }}
                      disabled={!isAdmin}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : conditionalAccessPolicies.length > 0 ? (
                    <div className="space-y-2">
                      {conditionalAccessPolicies.map((policy) => (
                        <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{policy.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              Modified: {new Date(policy.modifiedDateTime).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={policy.state === 'enabled' ? 'default' : policy.state === 'enabledForReportingButNotEnforced' ? 'secondary' : 'outline'}>
                            {policy.state === 'enabled' ? 'On' : policy.state === 'enabledForReportingButNotEnforced' ? 'Report Only' : 'Off'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Lock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conditional access policies found</p>
                      <p className="text-xs mt-1">Requires Policy.Read.All</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="secure-score" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Microsoft Secure Score
                    </CardTitle>
                    <CardDescription>
                      Your organization's security posture score
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchSecureScoreData();
                      toast.success('Fetching secure score...');
                    }}
                    disabled={!isAdmin}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Score
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : secureScore ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-primary">
                              {Math.round((secureScore.currentScore / secureScore.maxScore) * 100)}%
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {secureScore.currentScore.toFixed(1)} / {secureScore.maxScore.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">Your Score</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-4xl font-bold">
                              {secureScore.maxScore.toFixed(0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Maximum Score</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-4xl font-bold">
                              {Math.round(secureScore.averageComparativeScore)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Industry Average</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {secureScore.controlScores.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Control Scores</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {secureScore.controlScores.map((control, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg group">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{control.controlName}</p>
                                <p 
                                  className="text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all cursor-help"
                                  title={control.description}
                                >
                                  {control.description}
                                </p>
                              </div>
                              <Badge variant={control.score > 0 ? "default" : "secondary"} className="ml-2 shrink-0">
                                {control.score.toFixed(1)} pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No secure score data available.</p>
                    <p className="text-xs mt-2">Requires SecurityEvents.Read.All permission</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">eDiscovery & Content Search</h2>
            </div>
            <ContentSearchPanel isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Microsoft365Dashboard;
