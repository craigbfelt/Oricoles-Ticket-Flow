import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye, FileCode, Clock, Copy, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Check if an error is a FunctionsFetchError (CORS or network issue)
 * indicating the edge function is not deployed or unreachable
 */
function isEdgeFunctionDeploymentError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  const errorName = err?.name || '';
  const errorMessage = err?.message || '';
  
  // FunctionsFetchError is thrown when the edge function can't be reached
  // This typically means the function is not deployed
  return errorName === 'FunctionsFetchError' || 
         errorMessage.includes('Failed to send a request to the Edge Function');
}

/**
 * Get a user-friendly message for edge function deployment errors
 */
function getEdgeFunctionDeploymentErrorMessage(migrationVersion?: string): string {
  const sqlCommand = migrationVersion 
    ? `\n\nSQL Command:\nINSERT INTO public.schema_migrations (version, applied_at) VALUES ('${migrationVersion.replace(/\.sql$/, '')}', NOW()) ON CONFLICT (version) DO NOTHING;`
    : '';
  
  return 'Unable to reach the Edge Function. The function may not be deployed yet. ' +
    'You can manually record the migration in the schema_migrations table using the Backend SQL Editor. ' +
    'Click "Open Backend SQL Editor" below and run the SQL command.' + sqlCommand;
}

// Import all SQL migration files at build time using Vite's glob import with raw content
const migrationModules = import.meta.glob<string>(
  '../../supabase/migrations/*.sql',
  { query: '?raw', import: 'default', eager: true }
);

/**
 * Normalize migration version by removing .sql extension if present
 * This ensures consistent storage in the schema_migrations table
 */
const normalizeMigrationVersion = (version: string): string => {
  return version.replace(/\.sql$/, '');
};

/**
 * Extract filename from a path string safely
 */
const extractFilename = (path: string): string | null => {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  // Validate that it looks like a migration file
  if (filename && filename.endsWith('.sql')) {
    return filename;
  }
  return null;
};

// Create a map of filename to SQL content and dynamically get the list of all migrations
const migrationSqlContent: Record<string, string> = {};
const ALL_MIGRATIONS: string[] = [];

for (const [path, content] of Object.entries(migrationModules)) {
  const filename = extractFilename(path);
  if (filename) {
    migrationSqlContent[filename] = content;
    ALL_MIGRATIONS.push(filename);
  }
}

// Sort migrations by filename (which includes timestamp) to ensure chronological order
ALL_MIGRATIONS.sort();

interface MigrationStatus {
  filename: string;
  applied: boolean;
  appliedAt?: string;
  order: number;
}

const Migrations = () => {
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);
  const [sqlContent, setSqlContent] = useState<string>("");
  const [loadingSql, setLoadingSql] = useState(false);
  const [markingAsApplied, setMarkingAsApplied] = useState<string | null>(null);
  const [selectedMigrations, setSelectedMigrations] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);
  const { toast } = useToast();

  const fetchMigrationStatus = async () => {
    setLoading(true);
    try {
      const { data: appliedMigrations, error } = await supabase
        .from("schema_migrations" as any)
        .select("version, applied_at")
        .order("applied_at", { ascending: true });

      if (error && !error.message.includes("does not exist")) {
        throw error;
      }

      const appliedSet = new Map(
        (appliedMigrations || []).map((m: any) => [m.version, m.applied_at])
      );

      const statusList: MigrationStatus[] = ALL_MIGRATIONS.map((filename, index) => ({
        filename,
        applied: appliedSet.has(filename),
        appliedAt: appliedSet.get(filename),
        order: index + 1,
      }));

      setMigrations(statusList);
    } catch (error: any) {
      console.error("Error fetching migrations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch migration status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSqlContent = async (filename: string) => {
    setLoadingSql(true);
    try {
      // Use pre-loaded SQL content from build-time imports
      const content = migrationSqlContent[filename];
      if (!content) {
        throw new Error(`Migration file not found: ${filename}`);
      }
      setSqlContent(content);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load SQL content",
        variant: "destructive",
      });
      setSqlContent("-- Error loading SQL file");
    } finally {
      setLoadingSql(false);
    }
  };

  useEffect(() => {
    fetchMigrationStatus();
    const interval = setInterval(fetchMigrationStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleViewSql = (filename: string) => {
    setSelectedMigration(filename);
    fetchSqlContent(filename);
  };

  const handleCopySql = (filename: string) => {
    const content = migrationSqlContent[filename];
    if (content) {
      navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: `SQL for ${filename} copied to clipboard`,
      });
    } else {
      toast({
        title: "Error",
        description: "SQL content not found",
        variant: "destructive",
      });
    }
  };

  const getSupabaseProjectId = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  };

  const openSupabaseSqlEditor = () => {
    const projectId = getSupabaseProjectId();
    if (projectId) {
      window.open(`https://supabase.com/dashboard/project/${projectId}/sql`, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Could not detect Supabase project ID",
        variant: "destructive",
      });
    }
  };

  const markMigrationAsApplied = async (migrationVersion: string) => {
    setMarkingAsApplied(migrationVersion);
    try {
      const { data, error } = await supabase.functions.invoke('mark-migrations-applied', {
        body: { migrations: [normalizeMigrationVersion(migrationVersion)] }
      });

      if (error) {
        if (isEdgeFunctionDeploymentError(error)) {
          throw new Error(getEdgeFunctionDeploymentErrorMessage(migrationVersion));
        }
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to mark migration as applied');
      }

      toast({
        title: "Success",
        description: `Migration ${migrationVersion} marked as applied`,
      });

      // Refresh the migration status
      await fetchMigrationStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark migration as applied';
      console.error("Error marking migration as applied:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setMarkingAsApplied(null);
    }
  };

  const markSelectedAsApplied = async () => {
    if (selectedMigrations.size === 0) {
      toast({
        title: "No migrations selected",
        description: "Please select migrations to mark as applied",
        variant: "destructive",
      });
      return;
    }

    setBulkMarking(true);
    try {
      const migrationsToMark = Array.from(selectedMigrations).map(normalizeMigrationVersion);
      
      const { data, error } = await supabase.functions.invoke('mark-migrations-applied', {
        body: { migrations: migrationsToMark }
      });

      if (error) {
        if (isEdgeFunctionDeploymentError(error)) {
          const sqlCommands = migrationsToMark.map(v => 
            `INSERT INTO public.schema_migrations (version, applied_at) VALUES ('${v}', NOW()) ON CONFLICT (version) DO NOTHING;`
          ).join('\n');
          throw new Error(getEdgeFunctionDeploymentErrorMessage() + '\n\nSQL Commands:\n' + sqlCommands);
        }
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to mark migrations as applied');
      }

      toast({
        title: "Success",
        description: `${migrationsToMark.length} migration(s) marked as applied`,
      });

      // Clear selection and refresh
      setSelectedMigrations(new Set());
      await fetchMigrationStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark migrations as applied';
      console.error("Error marking migrations as applied:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setBulkMarking(false);
    }
  };

  const toggleMigrationSelection = (filename: string) => {
    const newSelection = new Set(selectedMigrations);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedMigrations(newSelection);
  };

  const selectAllPending = () => {
    const pendingMigrations = migrations.filter(m => !m.applied).map(m => m.filename);
    setSelectedMigrations(new Set(pendingMigrations));
  };

  const clearSelection = () => {
    setSelectedMigrations(new Set());
  };

  const appliedCount = migrations.filter((m) => m.applied).length;
  const totalCount = migrations.length;
  const progress = totalCount > 0 ? (appliedCount / totalCount) * 100 : 0;
  const pendingMigrations = migrations.filter(m => !m.applied);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not applied";
    return new Date(dateString).toLocaleString();
  };

  const formatFilename = (filename: string) => {
    const parts = filename.split("_");
    const timestamp = parts[0];
    const description = parts.slice(1).join("_").replace(".sql", "");
    return {
      timestamp,
      description: description.replace(/-/g, " ").replace(/^\d+/, "").trim(),
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              Database Migrations
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage database schema migrations
            </p>
          </div>
          <Button onClick={fetchMigrationStatus} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Migrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{appliedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {totalCount - appliedCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Progress</CardTitle>
            <CardDescription>
              {appliedCount} of {totalCount} migrations applied ({progress.toFixed(1)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Manual Migration Instructions */}
        {pendingMigrations.length > 0 && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">Pending Migrations Detected</p>
                <p className="text-sm text-muted-foreground">
                  You have {pendingMigrations.length} pending migration(s). If you've already manually run these migrations, 
                  you can mark them as applied using the buttons below. Otherwise, run the SQL in your Backend SQL editor first.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={openSupabaseSqlEditor} variant="outline" size="sm">
                    Open Backend SQL Editor
                  </Button>
                  <Button 
                    onClick={selectAllPending} 
                    variant="outline" 
                    size="sm"
                    disabled={pendingMigrations.length === 0}
                  >
                    Select All Pending ({pendingMigrations.length})
                  </Button>
                  {selectedMigrations.size > 0 && (
                    <>
                      <Button 
                        onClick={markSelectedAsApplied} 
                        variant="default" 
                        size="sm"
                        disabled={bulkMarking}
                      >
                        {bulkMarking ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          <>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark {selectedMigrations.size} as Applied
                          </>
                        )}
                      </Button>
                      <Button onClick={clearSelection} variant="ghost" size="sm">
                        Clear Selection
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Migrations List */}
        <Card>
          <CardHeader>
            <CardTitle>All Migrations</CardTitle>
            <CardDescription>
              Chronological list of all database migrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {migrations.map((migration) => {
                  const { timestamp, description } = formatFilename(migration.filename);
                  const isSelected = selectedMigrations.has(migration.filename);
                  const isMarking = markingAsApplied === migration.filename;
                  return (
                    <div
                      key={migration.filename}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors",
                        isSelected && "ring-2 ring-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {!migration.applied && (
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleMigrationSelection(migration.filename)}
                            className="flex-shrink-0"
                          />
                        )}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                          {migration.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs font-mono text-muted-foreground">
                              {timestamp}
                            </code>
                            {migration.order === 1 && (
                              <Badge variant="outline" className="text-xs">
                                Required First
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium truncate capitalize">{description}</p>
                          {migration.applied && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              Applied: {formatDate(migration.appliedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {migration.applied ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Applied
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markMigrationAsApplied(migration.filename)}
                              disabled={isMarking || bulkMarking}
                              title="Mark this migration as already applied"
                            >
                              {isMarking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCheck className="h-4 w-4 mr-1" />
                                  Mark Applied
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySql(migration.filename)}
                          title="Copy SQL to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSql(migration.filename)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View SQL
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SQL Preview Dialog */}
      <Dialog open={!!selectedMigration} onOpenChange={() => setSelectedMigration(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {selectedMigration}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>SQL content for this migration.</p>
              {migrations.find(m => m.filename === selectedMigration)?.applied ? (
                <p className="text-green-600 font-medium">✓ This migration has already been applied.</p>
              ) : (
                <ol className="text-sm list-decimal list-inside space-y-1">
                  <li>Copy the SQL below</li>
                  <li>Open Supabase SQL editor and run the SQL</li>
                  <li>Click "Mark as Applied" to record that this migration has been run</li>
                </ol>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {loadingSql ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <pre className="text-xs font-mono">
                <code>{sqlContent}</code>
              </pre>
            )}
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(sqlContent);
                toast({
                  title: "Copied!",
                  description: "SQL content copied to clipboard",
                });
              }}
            >
              Copy SQL
            </Button>
            <Button onClick={openSupabaseSqlEditor} variant="outline">
              Open Backend SQL Editor
            </Button>
            {selectedMigration && !migrations.find(m => m.filename === selectedMigration)?.applied && (
              <Button 
                onClick={async () => {
                  await markMigrationAsApplied(selectedMigration);
                  setSelectedMigration(null);
                }}
                variant="default"
                disabled={markingAsApplied === selectedMigration}
              >
                {markingAsApplied === selectedMigration ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark as Applied
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setSelectedMigration(null)} variant="secondary">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Migrations;
