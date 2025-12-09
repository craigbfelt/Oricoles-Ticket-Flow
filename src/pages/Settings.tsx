import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Copy, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import DashboardLayout from "@/components/DashboardLayout";

const Settings = () => {
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking");
  const [projectDetails, setProjectDetails] = useState<{ hasUser: boolean } | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "Not configured";
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "Not configured";
  const hasPublishableKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.error("Connection check error:", error);
        setConnectionStatus("error");
      } else {
        setConnectionStatus("connected");
        // Try to get additional project details
        const { data: { user } } = await supabase.auth.getUser();
        setProjectDetails({ hasUser: !!user });
      }
    } catch (err) {
      console.error("Connection check failed:", err);
      setConnectionStatus("error");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const openSupabaseDashboard = () => {
    if (supabaseProjectId && supabaseProjectId !== "Not configured") {
      window.open(`https://supabase.com/dashboard/project/${supabaseProjectId}`, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Customize your dashboard and view configuration details</p>
          </div>

          <Tabs defaultValue="theme" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="theme">Theme & Appearance</TabsTrigger>
              <TabsTrigger value="suppliers">IT Suppliers Style</TabsTrigger>
              <TabsTrigger value="connection">Connection Status</TabsTrigger>
            </TabsList>

            <TabsContent value="theme" className="space-y-6">
              <ThemeCustomizer />
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>IT Suppliers Page Styling</CardTitle>
                  <CardDescription>
                    Customize the appearance of the IT Suppliers page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Styling Information</AlertTitle>
                    <AlertDescription>
                      The IT Suppliers page uses a consistent pink-red color scheme (#E91E63) for headings, 
                      card titles, buttons, and links. The page styling is integrated with the main theme 
                      customizer. To change colors, fonts, or layout, please use the "Theme & Appearance" tab.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Current Styling</h3>
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Primary Color (Headings/Links)</span>
                          <Badge className="bg-[#E91E63] hover:bg-[#C2185B]">#E91E63</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Hover Color</span>
                          <Badge className="bg-[#C2185B]">#C2185B</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Layout</span>
                          <Badge variant="outline">Grid (1/2/3 columns responsive)</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">Card Style</span>
                          <Badge variant="outline">Shadow on hover, clickable</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Features</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                          <span>Clickable supplier cards that navigate to detailed view</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                          <span>Back navigation button on detail pages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                          <span>Responsive grid layout (mobile to desktop)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                          <span>Admin-only edit and delete controls</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connection" className="space-y-6">

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Supabase Connection Status</CardTitle>
                <CardDescription>Current status of your Supabase connection</CardDescription>
              </div>
              {connectionStatus === "connected" && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Connected
                </Badge>
              )}
              {connectionStatus === "error" && (
                <Badge variant="destructive">
                  <XCircle className="w-4 h-4 mr-1" />
                  Error
                </Badge>
              )}
              {connectionStatus === "checking" && (
                <Badge variant="secondary">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Checking...
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connectionStatus === "connected" && (
                <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
                  ✅ Successfully connected to Supabase. Your app can communicate with the database.
                </p>
              )}
              {connectionStatus === "error" && (
                <div className="text-sm text-red-700 bg-red-50 p-3 rounded-md space-y-2">
                  <p className="font-semibold">❌ Connection Error</p>
                  <p>Unable to connect to Supabase. This could mean:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>The Supabase project is paused or doesn't exist</li>
                    <li>Invalid credentials in environment variables</li>
                    <li>Network connectivity issues</li>
                    <li>Row Level Security (RLS) policies blocking access</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supabase Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Supabase Configuration</CardTitle>
            <CardDescription>Current Supabase project configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project ID */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Project ID</p>
                <p className="text-lg font-mono text-gray-900 mt-1">{supabaseProjectId}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(supabaseProjectId, "Project ID")}
                  disabled={supabaseProjectId === "Not configured"}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openSupabaseDashboard}
                  disabled={supabaseProjectId === "Not configured"}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Supabase URL */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Supabase URL</p>
                <p className="text-sm font-mono text-gray-900 mt-1 break-all">{supabaseUrl}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(supabaseUrl, "Supabase URL")}
                disabled={supabaseUrl === "Not configured"}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Publishable Key Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Publishable Key (Anon Key)</p>
                <p className="text-sm text-gray-600 mt-1">
                  {hasPublishableKey ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Configured (Hidden for security)
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      Not configured
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Resources to help you manage your Supabase connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Finding Your Supabase Connection</p>
                  <p className="text-sm text-blue-700 mt-1">
                    See the comprehensive guide: <code className="bg-blue-100 px-1 rounded">FIND_YOUR_SUPABASE_CONNECTION.md</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-purple-900">Access Supabase Dashboard</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Visit: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">https://supabase.com/dashboard</a>
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    Look for project ID: <code className="bg-purple-100 px-1 rounded">{supabaseProjectId}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-green-900">Verify Your Setup</p>
                  <p className="text-sm text-green-700 mt-1">
                    See: <code className="bg-green-100 px-1 rounded">VERIFY_SUPABASE_CONNECTION.md</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                <strong>Important:</strong> This page shows the configuration from your environment variables. 
                If you're using Lovable, the environment variables set in Lovable's dashboard control what's used in production.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lovable Integration Info */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">For Lovable Users</CardTitle>
            <CardDescription className="text-orange-700">How to find your Supabase connection in Lovable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-orange-900">
            <div className="space-y-2">
              <p className="font-semibold">To verify which Supabase instance your Lovable app is using:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open your Lovable project dashboard</li>
                <li>Go to <strong>Settings → Environment Variables</strong></li>
                <li>Check the values for:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li><code className="bg-orange-100 px-1 rounded">VITE_SUPABASE_URL</code></li>
                    <li><code className="bg-orange-100 px-1 rounded">VITE_SUPABASE_PROJECT_ID</code></li>
                    <li><code className="bg-orange-100 px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code></li>
                  </ul>
                </li>
                <li>Compare with the values shown on this page</li>
              </ol>
              <p className="mt-3 p-3 bg-orange-100 rounded-md">
                💡 <strong>Note:</strong> If you added a Supabase integration manually in Lovable, it doesn't automatically 
                update these environment variables. You need to update them manually to use your chosen Supabase project.
              </p>
            </div>
          </CardContent>
        </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
