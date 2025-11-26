import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Waves, 
  Users, 
  TrendingUp, 
  Calendar,
  Plus,
  Search,
  ExternalLink,
  Settings,
  Database,
  RefreshCw,
  Link2,
  CheckCircle,
  XCircle,
  Key
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlatformCredentials } from "@/components/PlatformCredentials";

interface BluewaveConnection {
  id: string;
  server_url: string;
  api_key: string;
  is_connected: boolean;
  last_sync: string | null;
}

const BluewaveCRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [configData, setConfigData] = useState({
    serverUrl: "",
    apiKey: "",
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
      // Check localStorage for saved Bluewave connection
      const savedConnection = localStorage.getItem('bluewave-connection');
      if (savedConnection) {
        const connection = JSON.parse(savedConnection);
        setIsConnected(connection.isConnected || false);
        setConfigData({
          serverUrl: connection.serverUrl || "",
          apiKey: connection.apiKey || "",
        });
        setLastSyncTime(connection.lastSync || null);
      }
    } catch (error) {
      console.error("Error loading Bluewave connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!configData.serverUrl || !configData.apiKey) {
      toast({
        title: "Error",
        description: "Please enter both server URL and API key",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simulate connection test
      // In production, this would make an actual API call to Bluewave
      await new Promise(resolve => setTimeout(resolve, 1500));

      const connectionData = {
        serverUrl: configData.serverUrl,
        apiKey: configData.apiKey,
        isConnected: true,
        lastSync: new Date().toISOString(),
      };

      localStorage.setItem('bluewave-connection', JSON.stringify(connectionData));
      setIsConnected(true);
      setLastSyncTime(connectionData.lastSync);
      setIsConfigDialogOpen(false);

      toast({
        title: "Connected",
        description: "Successfully connected to Bluewave CRM",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Bluewave CRM. Please check your credentials.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('bluewave-connection');
    setIsConnected(false);
    setConfigData({ serverUrl: "", apiKey: "" });
    setLastSyncTime(null);
    
    toast({
      title: "Disconnected",
      description: "Bluewave CRM connection removed",
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedConnection = {
        ...JSON.parse(localStorage.getItem('bluewave-connection') || '{}'),
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem('bluewave-connection', JSON.stringify(updatedConnection));
      setLastSyncTime(updatedConnection.lastSync);

      toast({
        title: "Sync Complete",
        description: "Successfully synced data with Bluewave CRM",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Bluewave CRM",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Waves className="w-8 h-8 text-blue-500" />
              Bluewave CRM
            </h1>
            <p className="text-muted-foreground">
              Integration with Bluewave CRM for customer relationship management
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
                Connect to Bluewave
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
                        Server: {configData.serverUrl}
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
                        Configure your Bluewave CRM connection to get started
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
          <Tabs defaultValue="customers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="opportunities">
                <TrendingUp className="h-4 w-4 mr-2" />
                Opportunities
              </TabsTrigger>
              <TabsTrigger value="activities">
                <Calendar className="h-4 w-4 mr-2" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="credentials">
                <Key className="h-4 w-4 mr-2" />
                Credentials
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>Customers</CardTitle>
                  <CardDescription>
                    Customer data synced from Bluewave CRM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search customers..." className="pl-8" />
                    </div>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </div>
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Customer data will appear here after syncing with Bluewave CRM</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load customers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities">
              <Card>
                <CardHeader>
                  <CardTitle>Opportunities</CardTitle>
                  <CardDescription>
                    Sales opportunities from Bluewave CRM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Opportunity data will appear here after syncing with Bluewave CRM</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load opportunities
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle>Activities</CardTitle>
                  <CardDescription>
                    Recent activities and tasks from Bluewave CRM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Activity data will appear here after syncing with Bluewave CRM</p>
                    <Button variant="link" onClick={handleSync} disabled={isSyncing}>
                      Sync now to load activities
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credentials">
              <PlatformCredentials 
                platform="bluewave"
                title="Bluewave Credentials"
                description="Manage login credentials for Bluewave CRM and related services (RDP, Active Directory, Email, etc.)"
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Waves className="h-4 w-4" />
              <AlertTitle>Get Started with Bluewave CRM</AlertTitle>
              <AlertDescription>
                Connect your Bluewave CRM account to sync customers, opportunities, and activities.
                You'll need your Bluewave server URL and API key to get started.
              </AlertDescription>
            </Alert>
            
            {/* Show credentials even when not connected */}
            <PlatformCredentials 
              platform="bluewave"
              title="Bluewave Credentials"
              description="Manage login credentials for Bluewave CRM and related services (RDP, Active Directory, Email, etc.)"
            />
          </div>
        )}

        {/* Configuration Dialog */}
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-blue-500" />
                Bluewave CRM Configuration
              </DialogTitle>
              <DialogDescription>
                Enter your Bluewave CRM server details to establish a connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverUrl">Server URL</Label>
                <Input
                  id="serverUrl"
                  value={configData.serverUrl}
                  onChange={(e) => setConfigData({ ...configData, serverUrl: e.target.value })}
                  placeholder="https://your-company.bluewave.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={configData.apiKey}
                  onChange={(e) => setConfigData({ ...configData, apiKey: e.target.value })}
                  placeholder="Enter your Bluewave API key"
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

export default BluewaveCRM;
