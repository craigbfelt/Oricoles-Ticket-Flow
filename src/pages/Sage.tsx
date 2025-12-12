import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Leaf, 
  DollarSign, 
  FileText, 
  BarChart3,
  Plus,
  Search,
  Settings,
  Database,
  RefreshCw,
  Link2,
  CheckCircle,
  XCircle,
  Receipt,
  CreditCard,
  Users,
  Building2,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SageConnection {
  id: string;
  environment: string;
  company_id: string;
  is_connected: boolean;
  last_sync: string | null;
}

const Sage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [configData, setConfigData] = useState({
    environment: "production",
    companyId: "",
    clientId: "",
    clientSecret: "",
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
    loadConnectionStatus();
  }, [navigate]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadConnectionStatus = async () => {
    setIsLoading(true);
    try {
      // Check localStorage for saved Sage connection
      const savedConnection = localStorage.getItem('sage-connection');
      if (savedConnection) {
        const connection = JSON.parse(savedConnection);
        setIsConnected(connection.isConnected || false);
        setConfigData({
          environment: connection.environment || "production",
          companyId: connection.companyId || "",
          clientId: connection.clientId || "",
          clientSecret: connection.clientSecret || "",
        });
        setLastSyncTime(connection.lastSync || null);
      }
    } catch (error) {
      console.error("Error loading Sage connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!configData.companyId || !configData.clientId || !configData.clientSecret) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simulate OAuth connection process
      // In production, this would redirect to Sage OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));

      const connectionData = {
        environment: configData.environment,
        companyId: configData.companyId,
        clientId: configData.clientId,
        clientSecret: configData.clientSecret,
        isConnected: true,
        lastSync: new Date().toISOString(),
      };

      localStorage.setItem('sage-connection', JSON.stringify(connectionData));
      setIsConnected(true);
      setLastSyncTime(connectionData.lastSync);
      setIsConfigDialogOpen(false);

      toast({
        title: "Connected",
        description: "Successfully connected to Sage",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Sage. Please check your credentials.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('sage-connection');
    setIsConnected(false);
    setConfigData({ environment: "production", companyId: "", clientId: "", clientSecret: "" });
    setLastSyncTime(null);
    
    toast({
      title: "Disconnected",
      description: "Sage connection removed",
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedConnection = {
        ...JSON.parse(localStorage.getItem('sage-connection') || '{}'),
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem('sage-connection', JSON.stringify(updatedConnection));
      setLastSyncTime(updatedConnection.lastSync);

      toast({
        title: "Sync Complete",
        description: "Successfully synced data with Sage",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Sage",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Back Navigation */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Leaf className="w-8 h-8 text-green-500" />
              Sage
            </h1>
            <p className="text-muted-foreground">
              Integration with Sage for accounting and financial management
            </p>
          </div>
          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsConfigDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                Connect to Sage
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-medium text-green-600">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Environment: {configData.environment === 'production' ? 'Production' : 'Sandbox'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Company ID: {configData.companyId}
                      </p>
                      {lastSyncTime && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(lastSyncTime).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-muted-foreground">Not Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Configure your Sage connection to access financial data
                      </p>
                    </div>
                  </>
                )}
              </div>
              {isConnected && (
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {isConnected ? (
          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invoices">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>
                    Invoice data synced from Sage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search invoices..." className="pl-8" />
                    </div>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </div>
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Invoice data will appear here after syncing with Sage</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load invoices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>
                    Payment transactions from Sage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Payment data will appear here after syncing with Sage</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load payments
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>Customers</CardTitle>
                  <CardDescription>
                    Customer accounts from Sage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Customer data will appear here after syncing with Sage</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load customers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>
                    Accounting reports and analytics from Sage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                          Total Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">--</div>
                        <p className="text-xs text-muted-foreground">Sync to view</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                          Outstanding Invoices
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600">--</div>
                        <p className="text-xs text-muted-foreground">Sync to view</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                          Active Customers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Sync to view</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed reports will appear here after syncing with Sage</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Alert>
            <Leaf className="h-4 w-4" />
            <AlertTitle>Get Started with Sage</AlertTitle>
            <AlertDescription>
              Connect your Sage account to sync invoices, payments, customers, and financial reports.
              You'll need your Sage API credentials to get started.
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Dialog */}
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Sage Configuration
              </DialogTitle>
              <DialogDescription>
                Enter your Sage API credentials to establish a connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={configData.environment}
                  onValueChange={(value) => setConfigData({ ...configData, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company ID</Label>
                <Input
                  id="companyId"
                  value={configData.companyId}
                  onChange={(e) => setConfigData({ ...configData, companyId: e.target.value })}
                  placeholder="Enter your Sage Company ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={configData.clientId}
                  onChange={(e) => setConfigData({ ...configData, clientId: e.target.value })}
                  placeholder="Enter your Sage Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={configData.clientSecret}
                  onChange={(e) => setConfigData({ ...configData, clientSecret: e.target.value })}
                  placeholder="Enter your Sage Client Secret"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect}>
                {isConnected ? "Update Connection" : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Sage;
