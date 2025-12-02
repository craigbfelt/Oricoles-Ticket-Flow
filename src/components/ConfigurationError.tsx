import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const ConfigurationError = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Configuration Required</CardTitle>
          </div>
          <CardDescription>
            The application is not properly configured for this deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The following environment variables must be set in your Vercel project settings:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> - Your Supabase project URL</li>
            <li><code className="bg-muted px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> - Your Supabase anon/public key</li>
          </ul>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>To fix this:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mt-2">
              <li>Go to your <a href="https://vercel.com" className="text-primary underline" target="_blank" rel="noopener noreferrer">Vercel Dashboard</a></li>
              <li>Select your project</li>
              <li>Navigate to Settings → Environment Variables</li>
              <li>Add the required variables</li>
              <li>Redeploy the application</li>
            </ol>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Find your Supabase credentials at{" "}
              <a 
                href="https://supabase.com/dashboard" 
                className="text-primary underline"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Supabase Dashboard
              </a>
              {" "}→ Project Settings → API
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationError;
