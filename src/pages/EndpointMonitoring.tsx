import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Monitor, 
  Shield, 
  Activity, 
  HardDrive, 
  Cpu, 
  Wifi, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Search,
  Download,
  Lock,
  ShieldAlert,
  Network
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface EndpointSummary {
  id: string;
  device_name: string;
  hostname: string;
  status: string;
  last_seen_at: string;
  user_id: string;
  os_name: string;
  os_version: string;
  os_build: string;
  antivirus_name: string;
  antivirus_enabled: boolean;
  windows_update_status: string;
  pending_updates_count: number;
  pending_updates_critical: number;
  ransomware_protection_enabled: boolean;
  bitlocker_enabled: boolean;
  storage_usage_percent: number;
  memory_usage_percent: number;
  cpu_usage_percent: number;
  overall_compliance_status: string;
  security_level: string;
  critical_issues_24h: number;
  security_events_24h: number;
  user_name: string;
  user_email: string;
}

interface EndpointDetails {
  endpoint: any;
  latestMetrics: any;
  recentScans: any[];
  policies: any[];
  securityEvents: any[];
  networkProcesses: any[];
}

const EndpointMonitoring = () => {
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [filteredEndpoints, setFilteredEndpoints] = useState<EndpointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (endpoints.length > 0) {
      filterEndpoints();
    }
  }, [searchQuery, endpoints]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user has admin or support_staff role
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "support_staff", "ceo"]);

    const hasAccess = rolesData && rolesData.length > 0;
    setIsAdmin(hasAccess);

    if (!hasAccess) {
      toast.error("Access Denied", {
        description: "You don't have permission to access endpoint monitoring.",
      });
      navigate("/dashboard");
      return;
    }

    loadEndpoints();
  };

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("endpoint_dashboard_summary")
        .select("*")
        .order("last_seen_at", { ascending: false });

      if (error) throw error;

      setEndpoints(data || []);
      setFilteredEndpoints(data || []);
    } catch (error: any) {
      console.error("Error loading endpoints:", error);
      toast.error("Failed to load endpoints", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEndpoints = () => {
    if (!searchQuery.trim()) {
      setFilteredEndpoints(endpoints);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = endpoints.filter(
      (endpoint) =>
        endpoint.device_name?.toLowerCase().includes(query) ||
        endpoint.hostname?.toLowerCase().includes(query) ||
        endpoint.user_name?.toLowerCase().includes(query) ||
        endpoint.user_email?.toLowerCase().includes(query) ||
        endpoint.os_name?.toLowerCase().includes(query)
    );

    setFilteredEndpoints(filtered);
  };

  const loadEndpointDetails = async (endpointId: string) => {
    try {
      // Load endpoint details
      const { data: endpoint, error: endpointError } = await supabase
        .from("endpoint_monitoring")
        .select("*")
        .eq("id", endpointId)
        .single();

      if (endpointError) throw endpointError;

      // Load latest metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("endpoint_metrics")
        .select("*")
        .eq("endpoint_id", endpointId)
        .order("collected_at", { ascending: false })
        .limit(1)
        .single();

      // Load recent scans
      const { data: scans } = await supabase
        .from("endpoint_security_scans")
        .select("*")
        .eq("endpoint_id", endpointId)
        .order("scan_completed_at", { ascending: false })
        .limit(5);

      // Load policies
      const { data: policies } = await supabase
        .from("endpoint_policies")
        .select("*")
        .eq("endpoint_id", endpointId)
        .order("compliance_status", { ascending: true });

      // Load security events
      const { data: events } = await supabase
        .from("endpoint_security_events")
        .select("*")
        .eq("endpoint_id", endpointId)
        .order("event_time", { ascending: false })
        .limit(10);

      // Load network processes
      const { data: processes } = await supabase
        .from("endpoint_network_processes")
        .select("*")
        .eq("endpoint_id", endpointId)
        .order("collected_at", { ascending: false })
        .limit(20);

      setSelectedEndpoint({
        endpoint,
        latestMetrics: metrics,
        recentScans: scans || [],
        policies: policies || [],
        securityEvents: events || [],
        networkProcesses: processes || [],
      });

      setSheetOpen(true);
    } catch (error: any) {
      console.error("Error loading endpoint details:", error);
      toast.error("Failed to load endpoint details", {
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { variant: "default" as const, color: "bg-green-500", label: "Online" },
      offline: { variant: "secondary" as const, color: "bg-gray-500", label: "Offline" },
      warning: { variant: "outline" as const, color: "bg-yellow-500", label: "Warning" },
      critical: { variant: "destructive" as const, color: "bg-red-500", label: "Critical" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSecurityLevelBadge = (level: string) => {
    const levelConfig = {
      secure: { variant: "default" as const, icon: CheckCircle2, color: "text-green-500" },
      warning: { variant: "outline" as const, icon: AlertTriangle, color: "text-yellow-500" },
      critical: { variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
      unknown: { variant: "secondary" as const, icon: AlertTriangle, color: "text-gray-500" },
    };

    const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.unknown;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {level}
      </Badge>
    );
  };

  const getComplianceBadge = (status: string) => {
    const statusConfig = {
      compliant: { variant: "default" as const, label: "Compliant" },
      non_compliant: { variant: "destructive" as const, label: "Non-Compliant" },
      not_evaluated: { variant: "secondary" as const, label: "Not Evaluated" },
      warning: { variant: "outline" as const, label: "Warning" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_evaluated;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getOverallStats = () => {
    return {
      total: endpoints.length,
      online: endpoints.filter(e => e.status === 'online').length,
      critical: endpoints.filter(e => e.status === 'critical' || e.security_level === 'critical').length,
      nonCompliant: endpoints.filter(e => e.overall_compliance_status === 'non_compliant').length,
      avgCompliance: endpoints.length > 0 
        ? Math.round((endpoints.filter(e => e.overall_compliance_status === 'compliant').length / endpoints.length) * 100)
        : 0,
    };
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <DashboardLayout title="Endpoint Monitoring">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Endpoint Monitoring">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.online}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.nonCompliant}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgCompliance}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search endpoints by name, hostname, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={loadEndpoints} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Endpoints Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEndpoints.map((endpoint) => (
            <Card 
              key={endpoint.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => loadEndpointDetails(endpoint.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{endpoint.device_name}</CardTitle>
                  {getStatusBadge(endpoint.status)}
                </div>
                <CardDescription>
                  {endpoint.user_name} • {endpoint.hostname}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>{endpoint.os_name} {endpoint.os_version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {endpoint.antivirus_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{endpoint.antivirus_name || "No AV"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    {endpoint.bitlocker_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(endpoint.last_seen_at)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage</span>
                    <span>{endpoint.storage_usage_percent?.toFixed(0)}%</span>
                  </div>
                  <Progress value={endpoint.storage_usage_percent || 0} />
                </div>

                <div className="flex items-center justify-between">
                  {getSecurityLevelBadge(endpoint.security_level)}
                  {getComplianceBadge(endpoint.overall_compliance_status)}
                </div>

                {(endpoint.critical_issues_24h > 0 || endpoint.security_events_24h > 0) && (
                  <div className="flex gap-2 text-xs">
                    {endpoint.critical_issues_24h > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {endpoint.critical_issues_24h} Critical Issues
                      </Badge>
                    )}
                    {endpoint.security_events_24h > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {endpoint.security_events_24h} Security Events
                      </Badge>
                    )}
                  </div>
                )}

                {endpoint.pending_updates_critical > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {endpoint.pending_updates_critical} Critical Updates Pending
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEndpoints.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Monitor className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No endpoints found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "No endpoints are currently reporting"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Endpoint Details Sheet */}
      {selectedEndpoint && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedEndpoint.endpoint.device_name}</SheetTitle>
              <SheetDescription>
                Detailed endpoint information and metrics
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hostname:</span>
                      <span className="font-medium">{selectedEndpoint.endpoint.hostname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OS:</span>
                      <span className="font-medium">
                        {selectedEndpoint.endpoint.os_name} {selectedEndpoint.endpoint.os_version}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Build:</span>
                      <span className="font-medium">{selectedEndpoint.endpoint.os_build}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPU:</span>
                      <span className="font-medium">
                        {selectedEndpoint.endpoint.cpu_model} ({selectedEndpoint.endpoint.cpu_cores} cores)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory:</span>
                      <span className="font-medium">{selectedEndpoint.endpoint.total_memory_gb} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage:</span>
                      <span className="font-medium">{selectedEndpoint.endpoint.total_storage_gb} GB</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedEndpoint.latestMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Current Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CPU Usage</span>
                          <span>{selectedEndpoint.latestMetrics.cpu_usage_percent}%</span>
                        </div>
                        <Progress value={selectedEndpoint.latestMetrics.cpu_usage_percent} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>{selectedEndpoint.latestMetrics.memory_usage_percent}%</span>
                        </div>
                        <Progress value={selectedEndpoint.latestMetrics.memory_usage_percent} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Storage Usage</span>
                          <span>{selectedEndpoint.latestMetrics.storage_usage_percent}%</span>
                        </div>
                        <Progress value={selectedEndpoint.latestMetrics.storage_usage_percent} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                {selectedEndpoint.latestMetrics && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Antivirus Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Antivirus:</span>
                          <span className="font-medium">{selectedEndpoint.latestMetrics.antivirus_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Enabled:</span>
                          {selectedEndpoint.latestMetrics.antivirus_enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Real-Time Protection:</span>
                          {selectedEndpoint.latestMetrics.antivirus_real_time_protection ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Protection Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">BitLocker:</span>
                          {selectedEndpoint.latestMetrics.bitlocker_enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ransomware Protection:</span>
                          {selectedEndpoint.latestMetrics.ransomware_protection_enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Firewall:</span>
                          {selectedEndpoint.latestMetrics.firewall_enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {selectedEndpoint.recentScans.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Recent Security Scans</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedEndpoint.recentScans.map((scan: any) => (
                            <div key={scan.id} className="mb-4 pb-4 border-b last:border-0">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{scan.scan_type}</span>
                                <Badge variant={scan.issues_critical > 0 ? "destructive" : "default"}>
                                  {scan.scan_status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {scan.issues_found} issues found
                                {scan.issues_critical > 0 && ` (${scan.issues_critical} critical)`}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(scan.scan_completed_at)}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {selectedEndpoint.securityEvents.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Recent Security Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedEndpoint.securityEvents.map((event: any) => (
                            <div key={event.id} className="mb-4 pb-4 border-b last:border-0">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">{event.event_title}</span>
                                <Badge 
                                  variant={
                                    event.event_severity === 'critical' ? 'destructive' : 
                                    event.event_severity === 'high' ? 'destructive' :
                                    'outline'
                                  }
                                >
                                  {event.event_severity}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">{event.event_description}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(event.event_time)}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="network" className="space-y-4">
                {selectedEndpoint.latestMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Network Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upload Speed:</span>
                        <span className="font-medium">
                          {selectedEndpoint.latestMetrics.network_upload_mbps} Mbps
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Download Speed:</span>
                        <span className="font-medium">
                          {selectedEndpoint.latestMetrics.network_download_mbps} Mbps
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedEndpoint.networkProcesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Network Processes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEndpoint.networkProcesses.slice(0, 10).map((process: any) => (
                        <div key={process.id} className="mb-4 pb-4 border-b last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium flex items-center gap-2">
                              {process.process_name}
                              {process.is_suspicious && (
                                <Badge variant="destructive" className="text-xs">Suspicious</Badge>
                              )}
                              {process.is_blocked && (
                                <Badge variant="outline" className="text-xs">Blocked</Badge>
                              )}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>↑ {process.upload_rate_mbps} Mbps</div>
                            <div>↓ {process.download_rate_mbps} Mbps</div>
                            <div>{(process.bytes_sent / 1024 / 1024).toFixed(2)} MB sent</div>
                            <div>{(process.bytes_received / 1024 / 1024).toFixed(2)} MB received</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="policies" className="space-y-4">
                {selectedEndpoint.policies.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Group Policy Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEndpoint.policies.map((policy: any) => (
                        <div key={policy.id} className="mb-4 pb-4 border-b last:border-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{policy.policy_name}</div>
                              <div className="text-sm text-muted-foreground">{policy.policy_category}</div>
                            </div>
                            {getComplianceBadge(policy.compliance_status)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Current: </span>
                              <span>{policy.current_value}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expected: </span>
                              <span>{policy.expected_value}</span>
                            </div>
                          </div>
                          {!policy.is_compliant && policy.can_auto_fix && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Auto-fix available
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-32">
                      <p className="text-sm text-muted-foreground">No policy data available</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      )}
    </DashboardLayout>
  );
};

export default EndpointMonitoring;
