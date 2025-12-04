import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Construction, Settings } from "lucide-react";

const Microsoft365Dashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setIsAdmin(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Microsoft 365 Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your Microsoft 365 environment</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Construction className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Microsoft 365 Integration</CardTitle>
            <CardDescription className="text-base">
              Coming Soon - Under Development
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground max-w-lg mx-auto">
              The Microsoft 365 sync feature is being rebuilt from scratch to ensure seamless integration 
              between Edge Functions, Vercel, Supabase, and GitHub.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto">
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <Cloud className="h-8 w-8 text-blue-500 mb-2" />
                <h3 className="font-semibold">Azure Integration</h3>
                <Badge variant="outline" className="mt-2">Planned</Badge>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <Settings className="h-8 w-8 text-green-500 mb-2" />
                <h3 className="font-semibold">Auto Sync</h3>
                <Badge variant="outline" className="mt-2">Planned</Badge>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <Cloud className="h-8 w-8 text-purple-500 mb-2" />
                <h3 className="font-semibold">Device Management</h3>
                <Badge variant="outline" className="mt-2">Planned</Badge>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>For manual hardware inventory management, please visit the</p>
              <a href="/hardware-inventory" className="text-primary hover:underline">
                Hardware Inventory
              </a>
              {" "}page.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Microsoft365Dashboard;
