import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'manual_required';
  details?: string;
  manualAction?: string;
  requiredInput?: {
    key: string;
    label: string;
    placeholder: string;
    type?: string;
  }[];
}

interface MigrationConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseProjectId?: string;
  vercelProjectName?: string;
  githubToken?: string;
}

const MIGRATION_STEPS: MigrationStep[] = [
  {
    id: 'create_supabase',
    title: '1. Create New Supabase Project',
    description: 'Create a new free Supabase project at supabase.com',
    status: 'pending',
    manualAction: 'Go to https://supabase.com/dashboard and create a new project',
    requiredInput: [
      { key: 'supabaseUrl', label: 'Supabase URL', placeholder: 'https://your-project.supabase.co' },
      { key: 'supabaseAnonKey', label: 'Supabase Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      { key: 'supabaseProjectId', label: 'Supabase Project ID', placeholder: 'your-project-id' }
    ]
  },
  {
    id: 'validate_supabase',
    title: '2. Validate Supabase Connection',
    description: 'Test connection to the new Supabase project',
    status: 'pending'
  },
  {
    id: 'run_migrations',
    title: '3. Apply Database Migrations',
    description: 'Run all database migrations on the new Supabase instance',
    status: 'pending',
    manualAction: 'Run migrations using Supabase SQL Editor or CLI'
  },
  {
    id: 'create_vercel',
    title: '4. Create Vercel Project',
    description: 'Connect your GitHub repository to Vercel',
    status: 'pending',
    manualAction: 'Go to https://vercel.com/new and import your GitHub repository',
    requiredInput: [
      { key: 'vercelProjectName', label: 'Vercel Project Name', placeholder: 'oricol-dashboard' }
    ]
  },
  {
    id: 'configure_env',
    title: '5. Configure Environment Variables',
    description: 'Set up environment variables in Vercel',
    status: 'pending',
    manualAction: 'Add VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and VITE_SUPABASE_PROJECT_ID in Vercel project settings'
  },
  {
    id: 'setup_github_secrets',
    title: '6. Configure GitHub Secrets',
    description: 'Add Supabase secrets to GitHub for automated deployments',
    status: 'pending',
    manualAction: 'Add SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD to GitHub repository secrets'
  },
  {
    id: 'update_config',
    title: '7. Update Supabase Config',
    description: 'Update supabase/config.toml with new project ID',
    status: 'pending'
  },
  {
    id: 'deploy_vercel',
    title: '8. Deploy to Vercel',
    description: 'Trigger initial deployment to Vercel',
    status: 'pending'
  },
  {
    id: 'verify_deployment',
    title: '9. Verify Deployment',
    description: 'Confirm the application is working on the new infrastructure',
    status: 'pending'
  }
];

const MigrationTracker = () => {
  const [steps, setSteps] = useState<MigrationStep[]>(MIGRATION_STEPS);
  const [config, setConfig] = useState<MigrationConfig>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Load saved progress from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('migration_config');
    const savedSteps = localStorage.getItem('migration_steps');
    const savedLogs = localStorage.getItem('migration_logs');
    
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedSteps) setSteps(JSON.parse(savedSteps));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('migration_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('migration_steps', JSON.stringify(steps));
  }, [steps]);

  useEffect(() => {
    localStorage.setItem('migration_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateStepStatus = (stepId: string, status: MigrationStep['status'], details?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ));
    addLog(`Step "${stepId}" status updated to: ${status}${details ? ` - ${details}` : ''}`);
  };

  const handleInputChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const validateSupabaseConnection = async () => {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      toast.error('Please provide Supabase URL and Anon Key');
      return false;
    }

    setIsProcessing(true);
    updateStepStatus('validate_supabase', 'in_progress', 'Testing connection...');
    
    try {
      // Create a temporary client to test connection
      const testClient = createClient(config.supabaseUrl!, config.supabaseAnonKey!);

      // Try to query the database
      const { error } = await testClient.from('profiles').select('count').limit(1);
      
      // Known error codes that indicate successful connection but missing tables
      // PGRST116 = no rows found, 42P01 = table doesn't exist
      const acceptableErrorCodes = ['PGRST116', '42P01'];
      
      if (error && !acceptableErrorCodes.includes(error.code || '')) {
        throw error;
      }

      updateStepStatus('validate_supabase', 'completed', 'Connection successful');
      toast.success('Supabase connection validated successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStepStatus('validate_supabase', 'failed', errorMessage);
      toast.error(`Connection failed: ${errorMessage}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const getProgress = () => {
    const completed = steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  const getStatusIcon = (status: MigrationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'manual_required':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: MigrationStep['status']) => {
    const variants: Record<MigrationStep['status'], 'default' | 'destructive' | 'outline' | 'secondary'> = {
      pending: 'outline',
      in_progress: 'secondary',
      completed: 'default',
      failed: 'destructive',
      manual_required: 'secondary'
    };
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const markStepComplete = (stepId: string) => {
    updateStepStatus(stepId, 'completed');
  };

  const markStepManualRequired = (stepId: string) => {
    updateStepStatus(stepId, 'manual_required');
  };

  const handleResetMigration = () => {
    setSteps(MIGRATION_STEPS);
    setConfig({});
    setLogs([]);
    localStorage.removeItem('migration_config');
    localStorage.removeItem('migration_steps');
    localStorage.removeItem('migration_logs');
    toast.success('Migration progress reset');
  };

  const exportConfig = () => {
    const exportData = {
      config,
      steps,
      logs,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configuration exported');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Migration Tracker</CardTitle>
              <CardDescription>
                Track progress migrating to new Vercel & Supabase accounts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportConfig}>
                Export Progress
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Migration Progress?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to reset the migration progress? This will clear all saved configuration, step progress, and logs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetMigration}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required API Credentials</CardTitle>
          <CardDescription>
            Enter the credentials from your new Supabase and Vercel accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Required Information</AlertTitle>
            <AlertDescription>
              You'll need to create accounts and gather the following:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Supabase Project URL</strong> - Found in Project Settings → API</li>
                <li><strong>Supabase Anon Key</strong> - Found in Project Settings → API</li>
                <li><strong>Supabase Project ID</strong> - Found in Project Settings → General</li>
                <li><strong>Supabase Access Token</strong> - For GitHub Actions (Settings → Access Tokens)</li>
                <li><strong>Supabase DB Password</strong> - Set when creating the project</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
              <Input
                id="supabaseUrl"
                placeholder="https://your-project.supabase.co"
                value={config.supabaseUrl || ''}
                onChange={(e) => handleInputChange('supabaseUrl', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
              <Input
                id="supabaseAnonKey"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={config.supabaseAnonKey || ''}
                onChange={(e) => handleInputChange('supabaseAnonKey', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabaseProjectId">Supabase Project ID</Label>
              <Input
                id="supabaseProjectId"
                placeholder="your-project-id"
                value={config.supabaseProjectId || ''}
                onChange={(e) => handleInputChange('supabaseProjectId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vercelProjectName">Vercel Project Name</Label>
              <Input
                id="vercelProjectName"
                placeholder="oricol-dashboard"
                value={config.vercelProjectName || ''}
                onChange={(e) => handleInputChange('vercelProjectName', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={validateSupabaseConnection} 
              disabled={isProcessing || !config.supabaseUrl || !config.supabaseAnonKey}
            >
              {isProcessing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Validate Supabase Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migration Steps</CardTitle>
          <CardDescription>
            Complete each step in order. Some steps require manual action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {steps.map((step, index) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    {getStatusIcon(step.status)}
                    <span className="font-medium">{step.title}</span>
                    {getStatusBadge(step.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-muted-foreground">{step.description}</p>
                  
                  {step.manualAction && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Manual Action Required</AlertTitle>
                      <AlertDescription>{step.manualAction}</AlertDescription>
                    </Alert>
                  )}
                  
                  {step.details && (
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {step.details}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => markStepComplete(step.id)}
                      disabled={step.status === 'completed'}
                    >
                      Mark Complete
                    </Button>
                    {step.manualAction && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => markStepManualRequired(step.id)}
                      >
                        Mark as Manual
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migration Logs</CardTitle>
          <CardDescription>Real-time log of migration activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500">No logs yet. Start the migration process to see activity.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <ChevronRight className="inline h-3 w-3 mr-1" />
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationTracker;
