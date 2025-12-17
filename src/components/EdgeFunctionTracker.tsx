import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, ExternalLink, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EdgeFunction {
  id: string;
  name: string;
  description: string;
  status: 'deployed' | 'not_deployed' | 'checking' | 'error';
  lastChecked?: Date;
  deploymentMethod: 'automatic' | 'manual' | 'both';
  category: 'core' | 'automation' | 'integration' | 'admin';
  requiredEnvVars?: string[];
  manualInstructions?: string;
}

const EDGE_FUNCTIONS: Omit<EdgeFunction, 'status' | 'lastChecked'>[] = [
  {
    id: 'check-migrations',
    name: 'Check Migrations',
    description: 'Checks database migration status and history',
    deploymentMethod: 'both',
    category: 'admin',
    manualInstructions: 'supabase functions deploy check-migrations'
  },
  {
    id: 'confirm-provider-task',
    name: 'Confirm Provider Task',
    description: 'Confirms completion of provider tasks',
    deploymentMethod: 'both',
    category: 'automation',
    manualInstructions: 'supabase functions deploy confirm-provider-task'
  },
  {
    id: 'endpoint-data-ingestion',
    name: 'Endpoint Data Ingestion',
    description: 'Receives and processes endpoint monitoring data from agents',
    deploymentMethod: 'manual',
    category: 'core',
    requiredEnvVars: ['SUPABASE_SERVICE_ROLE_KEY'],
    manualInstructions: 'supabase functions deploy endpoint-data-ingestion'
  },
  {
    id: 'import-staff-users',
    name: 'Import Staff Users',
    description: 'Imports staff users from CSV or external sources',
    deploymentMethod: 'both',
    category: 'admin',
    manualInstructions: 'supabase functions deploy import-staff-users'
  },
  {
    id: 'm365-ediscovery-search',
    name: 'M365 eDiscovery Search',
    description: 'Performs Microsoft 365 eDiscovery searches',
    deploymentMethod: 'manual',
    category: 'integration',
    requiredEnvVars: ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    manualInstructions: 'supabase functions deploy m365-ediscovery-search'
  },
  {
    id: 'manage-user-roles',
    name: 'Manage User Roles',
    description: 'Manages user roles and permissions',
    deploymentMethod: 'both',
    category: 'core',
    requiredEnvVars: ['SUPABASE_SERVICE_ROLE_KEY'],
    manualInstructions: 'supabase functions deploy manage-user-roles'
  },
  {
    id: 'mark-migrations-applied',
    name: 'Mark Migrations Applied',
    description: 'Marks database migrations as applied',
    deploymentMethod: 'both',
    category: 'admin',
    manualInstructions: 'supabase functions deploy mark-migrations-applied'
  },
  {
    id: 'notify-ticket-assignment',
    name: 'Notify Ticket Assignment',
    description: 'Sends notifications for ticket assignments',
    deploymentMethod: 'both',
    category: 'automation',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    manualInstructions: 'supabase functions deploy notify-ticket-assignment'
  },
  {
    id: 'register-remote-client',
    name: 'Register Remote Client',
    description: 'Registers remote client devices for support',
    deploymentMethod: 'both',
    category: 'core',
    manualInstructions: 'supabase functions deploy register-remote-client'
  },
  {
    id: 'resend-provider-email',
    name: 'Resend Provider Email',
    description: 'Resends emails to providers',
    deploymentMethod: 'both',
    category: 'automation',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    manualInstructions: 'supabase functions deploy resend-provider-email'
  },
  {
    id: 'reset-user-password',
    name: 'Reset User Password',
    description: 'Handles user password reset requests',
    deploymentMethod: 'both',
    category: 'core',
    manualInstructions: 'supabase functions deploy reset-user-password'
  },
  {
    id: 'route-ticket-email',
    name: 'Route Ticket Email',
    description: 'Routes incoming ticket emails to appropriate handlers',
    deploymentMethod: 'both',
    category: 'automation',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT'],
    manualInstructions: 'supabase functions deploy route-ticket-email'
  },
  {
    id: 'send-staff-onboarding-email',
    name: 'Send Staff Onboarding Email',
    description: 'Sends onboarding emails to new staff members',
    deploymentMethod: 'both',
    category: 'automation',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'WEB_APP_URL'],
    manualInstructions: 'supabase functions deploy send-staff-onboarding-email'
  },
  {
    id: 'send-ticket-reminders',
    name: 'Send Ticket Reminders',
    description: 'Sends reminder notifications for pending tickets',
    deploymentMethod: 'both',
    category: 'automation',
    requiredEnvVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    manualInstructions: 'supabase functions deploy send-ticket-reminders'
  },
  {
    id: 'storage-admin-operations',
    name: 'Storage Admin Operations',
    description: 'Performs admin operations on storage buckets',
    deploymentMethod: 'both',
    category: 'admin',
    requiredEnvVars: ['SUPABASE_SERVICE_ROLE_KEY'],
    manualInstructions: 'supabase functions deploy storage-admin-operations'
  },
  {
    id: 'sync-microsoft-365',
    name: 'Sync Microsoft 365',
    description: 'Synchronizes data with Microsoft 365 Intune',
    deploymentMethod: 'manual',
    category: 'integration',
    requiredEnvVars: ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'],
    manualInstructions: 'supabase functions deploy sync-microsoft-365'
  },
  {
    id: 'sync-microsoft-365-debug',
    name: 'Sync Microsoft 365 (Debug)',
    description: 'Debug version of M365 sync with verbose logging',
    deploymentMethod: 'manual',
    category: 'integration',
    requiredEnvVars: ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'],
    manualInstructions: 'supabase functions deploy sync-microsoft-365-debug'
  },
  {
    id: 'verify-deployment',
    name: 'Verify Deployment',
    description: 'Verifies deployment status and health of all functions',
    deploymentMethod: 'both',
    category: 'admin',
    manualInstructions: 'supabase functions deploy verify-deployment'
  },
];

const EdgeFunctionTracker = () => {
  const [functions, setFunctions] = useState<EdgeFunction[]>(
    EDGE_FUNCTIONS.map(fn => ({ ...fn, status: 'checking' as const }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const checkFunctionStatus = async (functionName: string): Promise<'deployed' | 'not_deployed' | 'error'> => {
    try {
      // Get the Supabase project URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.warn('Supabase URL not configured');
        return 'error';
      }

      // Construct the function URL
      const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
      
      // Try to call the function with a simple health check
      // Most functions require authentication, so we expect a 401 or function-specific response
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If we get any response (even error), the function is deployed
      // 404 means function not found/not deployed
      if (response.status === 404) {
        return 'not_deployed';
      }
      
      // Any other status code means function exists
      return 'deployed';
    } catch (error) {
      // Network errors or CORS issues might indicate not deployed
      console.error(`Error checking ${functionName}:`, error);
      return 'error';
    }
  };

  const checkAllFunctions = async () => {
    setIsChecking(true);
    const checkTime = new Date();
    
    try {
      const statusChecks = await Promise.all(
        EDGE_FUNCTIONS.map(async (fn) => {
          const status = await checkFunctionStatus(fn.id);
          return {
            ...fn,
            status,
            lastChecked: checkTime,
          };
        })
      );
      
      setFunctions(statusChecks);
      setLastCheckTime(checkTime);
      toast.success('Function status check complete');
    } catch (error) {
      console.error('Error checking functions:', error);
      toast.error('Failed to check some function statuses');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check function status on mount
    checkAllFunctions();
  }, []);

  const getProgress = () => {
    const deployed = functions.filter(f => f.status === 'deployed').length;
    return Math.round((deployed / functions.length) * 100);
  };

  const getStatusIcon = (status: EdgeFunction['status']) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'not_deployed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: EdgeFunction['status']) => {
    const variants: Record<EdgeFunction['status'], 'default' | 'destructive' | 'outline' | 'secondary'> = {
      deployed: 'default',
      not_deployed: 'destructive',
      checking: 'secondary',
      error: 'outline',
    };
    
    const labels: Record<EdgeFunction['status'], string> = {
      deployed: 'Deployed',
      not_deployed: 'Not Deployed',
      checking: 'Checking...',
      error: 'Unknown',
    };
    
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getCategoryBadge = (category: EdgeFunction['category']) => {
    const colors: Record<EdgeFunction['category'], string> = {
      core: 'bg-blue-500',
      automation: 'bg-purple-500',
      integration: 'bg-green-500',
      admin: 'bg-orange-500',
    };
    
    return <Badge className={`${colors[category]} text-white text-xs`}>{category}</Badge>;
  };

  const getDeploymentMethodBadge = (method: EdgeFunction['deploymentMethod']) => {
    const config = {
      automatic: { label: 'Auto Deploy', variant: 'default' as const },
      manual: { label: 'Manual Only', variant: 'secondary' as const },
      both: { label: 'Both', variant: 'outline' as const },
    };
    
    const { label, variant } = config[method];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const groupedFunctions = {
    core: functions.filter(f => f.category === 'core'),
    automation: functions.filter(f => f.category === 'automation'),
    integration: functions.filter(f => f.category === 'integration'),
    admin: functions.filter(f => f.category === 'admin'),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Code className="h-6 w-6" />
                Edge Functions Status
              </CardTitle>
              <CardDescription>
                Monitor and track Supabase Edge Function deployments
              </CardDescription>
            </div>
            <Button 
              onClick={checkAllFunctions} 
              disabled={isChecking}
              size="sm"
            >
              {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Deployment Progress</span>
              <span className="text-sm text-muted-foreground">
                {functions.filter(f => f.status === 'deployed').length} / {functions.length} deployed
              </span>
            </div>
            <Progress value={getProgress()} className="h-3" />
          </div>
          
          {lastCheckTime && (
            <p className="text-xs text-muted-foreground mb-4">
              Last checked: {lastCheckTime.toLocaleString()}
            </p>
          )}

          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Deployment Information</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Automatic:</strong> Deployed via GitHub Actions on push to main</li>
                <li><strong>Manual:</strong> Requires manual deployment via Supabase CLI</li>
                <li><strong>Both:</strong> Can be deployed either way</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Functions by Category</CardTitle>
          <CardDescription>
            Click on any function to view deployment instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(groupedFunctions).map(([category, categoryFunctions]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-medium capitalize">{category} Functions</span>
                    <Badge variant="outline">{categoryFunctions.length}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryFunctions.filter(f => f.status === 'deployed').length} deployed
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {categoryFunctions.map((fn) => (
                      <div key={fn.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(fn.status)}
                            <div>
                              <h4 className="font-medium">{fn.name}</h4>
                              <p className="text-sm text-muted-foreground">{fn.description}</p>
                            </div>
                          </div>
                          {getStatusBadge(fn.status)}
                        </div>
                        
                        <div className="flex gap-2 mb-3">
                          {getCategoryBadge(fn.category)}
                          {getDeploymentMethodBadge(fn.deploymentMethod)}
                        </div>

                        {fn.requiredEnvVars && fn.requiredEnvVars.length > 0 && (
                          <Alert className="mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-sm">Required Environment Variables</AlertTitle>
                            <AlertDescription className="text-xs">
                              {fn.requiredEnvVars.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}

                        {fn.manualInstructions && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-xs font-medium mb-1">Manual Deployment Command:</p>
                            <code className="text-xs">{fn.manualInstructions}</code>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open('https://supabase.com/dashboard/project/_/functions', '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Supabase
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Deployment Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prerequisites</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Supabase CLI installed: <code>npm install -g supabase</code></li>
                <li>Logged in: <code>supabase login</code></li>
                <li>Project linked: <code>supabase link --project-ref YOUR_PROJECT_REF</code></li>
              </ul>
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium mb-2">Deploy All Functions</h4>
            <div className="bg-slate-950 text-green-400 p-3 rounded-lg font-mono text-sm">
              <code>
                for fn in supabase/functions/*/; do<br />
                &nbsp;&nbsp;fname=$(basename "$fn")<br />
                &nbsp;&nbsp;if [ "$fname" != "_shared" ] && [ -f "$fn/index.ts" ]; then<br />
                &nbsp;&nbsp;&nbsp;&nbsp;echo "Deploying $fname..."<br />
                &nbsp;&nbsp;&nbsp;&nbsp;supabase functions deploy "$fname"<br />
                &nbsp;&nbsp;fi<br />
                done
              </code>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Deploy Single Function</h4>
            <div className="bg-slate-950 text-green-400 p-3 rounded-lg font-mono text-sm">
              <code>supabase functions deploy function-name</code>
            </div>
          </div>

          <Button 
            onClick={() => window.open('/EDGE_FUNCTIONS_SETUP.md', '_blank')}
            className="w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Full Setup Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EdgeFunctionTracker;
