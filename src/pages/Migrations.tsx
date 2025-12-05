import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye, FileCode, Clock, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

// Import all SQL migration files at build time using Vite's glob import with raw content
const migrationModules = import.meta.glob<string>(
  '../../supabase/migrations/*.sql',
  { query: '?raw', import: 'default', eager: true }
);

// Create a map of filename to SQL content
const migrationSqlContent: Record<string, string> = {};
for (const [path, content] of Object.entries(migrationModules)) {
  // Extract filename from path (e.g., "../../supabase/migrations/20251100000000_create_schema_migrations_table.sql" -> "20251100000000_create_schema_migrations_table.sql")
  const filename = path.split('/').pop() || '';
  migrationSqlContent[filename] = content;
}

interface MigrationStatus {
  filename: string;
  applied: boolean;
  appliedAt?: string;
  order: number;
}

const ALL_MIGRATIONS = [
  "20251100000000_create_schema_migrations_table.sql",
  "20251108052000_bee9ee20-5a81-402a-bdd9-30cce8e8ecb7.sql",
  "20251109045855_6a7fc76b-c088-4052-a67d-5471bc1cf984.sql",
  "20251110192108_fab519ce-aecd-4771-8ff3-cb79de2cbe7d.sql",
  "20251111085548_c85ce8a8-0f94-4670-b767-004b83f996e9.sql",
  "20251111100012_f27546a6-3183-40a6-a659-83c56f6d07ec.sql",
  "20251111100704_b5302bee-33a3-4f14-84b4-8379994bdfca.sql",
  "20251111101518_6f9cb181-efcb-451b-8330-83e60e79ae67.sql",
  "20251111101727_5d0600ca-2ad2-42ba-b7fb-a8167a3f7ed6.sql",
  "20251111103503_2849fa7c-b530-45e3-9863-f6c6f4e2b98c.sql",
  "20251111111220_5d9f7f4b-d8b4-4f91-837b-9e306e9a8e14.sql",
  "20251111135922_f7475cb1-896e-428c-9441-fa5f9a9d3b44.sql",
  "20251111140343_ee4c7cca-e087-4f12-98f3-4340e6db9c2e.sql",
  "20251111143226_aff189ac-0a04-4e14-aa2b-3163baec918f.sql",
  "20251111143859_3bc3791c-fd30-46f5-a40e-5cc6864df211.sql",
  "20251112054548_cbcbc569-cc63-4810-8938-1a8d760222b0.sql",
  "20251112060133_28a7a03c-4f93-475a-9ba1-34e238edbfc9.sql",
  "20251112063832_f5103d15-9046-47b5-acf0-6835adf79161.sql",
  "20251112064207_553f2a8d-2fd8-45f6-8f5b-3c7bf3f97c00.sql",
  "20251112065350_76d95c8d-1109-46fa-8b90-e18e53a62df7.sql",
  "20251112065604_0346015b-e2b3-4bfe-a6b5-764f8ae93e59.sql",
  "20251112124800_add_ceo_role.sql",
  "20251112135110_restore_admin_role_for_craig.sql",
  "20251112151903_auto_assign_admin_role.sql",
  "20251112160000_allow_ceo_view_all_profiles.sql",
  "20251112161521_restore_admin_and_ceo_roles.sql",
  "20251112170113_create_new_admin_account.sql",
  "20251112172925_add_admin_zerobitone_to_auto_admin.sql",
  "20251112184500_fix_ceo_permissions.sql",
  "20251112185000_ensure_admin_roles.sql",
  "20251112190000_verify_permissions.sql",
  "20251112200000_ensure_craig_has_admin_role.sql",
  "20251112204108_remove_role_based_rls_policies.sql",
  "20251113044109_48d68a5f-09a0-4966-a8a0-d731a7f46081.sql",
  "20251113045637_23d17770-5ebe-4fab-88bf-62c6fd1e5174.sql",
  "20251113052200_create_import_and_network_tables.sql",
  "20251113111200_create_diagrams_storage_bucket.sql",
  "20251113141553_fd4f94c4-56b6-4b7e-84ae-6ef1a6fe28dd.sql",
  "20251113142600_create_documents_table_and_bucket.sql",
  "20251113144620_94ba20be-061a-4db7-ab47-d97e1a65f50e.sql",
  "20251113144637_6121518f-7da2-4788-84aa-e49a9edd5f75.sql",
  "20251113144706_84dc8187-e186-41a5-8010-daeb2d30f43d.sql",
  "20251113151700_fix_documents_storage_policies.sql",
  "20251113153200_fix_documents_table_rls_policies.sql",
  "20251113232600_comprehensive_rls_fix.sql",
  "20251114045447_aad8c850-8bf9-4f87-b922-e70dab761b14.sql",
  "20251115133000_verify_and_fix_lovable_rls.sql",
  "20251116070158_63eef662-012a-4e49-8b96-4593cca7ae1b.sql",
  "20251116081115_fix_network_diagrams_branch_id_nullable.sql",
  "20251116112700_enhance_user_profiles_and_document_hub.sql",
  "20251116114500_add_ticket_tracking_fields.sql",
  "20251116134300_fix_admin_full_access.sql",
  "20251116134400_create_user_groups_and_file_sharing.sql",
  "20251116134500_create_user_import_functions.sql",
  "20251117000000_create_shared_files_system.sql",
  "20251117102836_e9e402df-9138-41a1-874c-39dc729c3cbd.sql",
  "20251117131300_fix_shared_folders_dependencies.sql",
  "20251118031628_a1b4b539-b26d-419f-93d1-5a8e855ce824.sql",
  "20251119034817_f3a7a9e8-59e4-44e1-855e-a349b498bdb2.sql",
  "20251119050102_87ec93cb-5d13-4ff1-bc63-02721e798d75.sql",
  "20251119052800_fix_security_definer_search_path.sql",
  "20251119055823_backfill_missing_profiles.sql",
  "20251119080900_create_crm_system.sql",
  "20251120034137_82d09dde-5c06-48eb-a16f-a8f05a77a665.sql",
  "verify_admin_roles.sql",
];

const Migrations = () => {
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);
  const [sqlContent, setSqlContent] = useState<string>("");
  const [loadingSql, setLoadingSql] = useState(false);
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

  const appliedCount = migrations.filter((m) => m.applied).length;
  const totalCount = migrations.length;
  const progress = (appliedCount / totalCount) * 100;

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
        {totalCount > appliedCount && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Manual Migration Required</p>
                <p className="text-sm text-muted-foreground">
                  To apply pending migrations, click "View SQL" on any pending migration, copy the SQL, and run it in your Backend SQL editor. Then mark it as applied.
                </p>
                <Button onClick={openSupabaseSqlEditor} variant="outline" size="sm" className="mt-2">
                  Open Backend SQL Editor
                </Button>
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
                  return (
                    <div
                      key={migration.filename}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
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
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </Badge>
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
              <p>SQL content for this migration. Follow these steps:</p>
              <ol className="text-sm list-decimal list-inside space-y-1">
                <li>Copy the SQL below</li>
                <li>Open Backend SQL editor</li>
                <li>Paste and run the SQL</li>
                <li>Mark as applied with: <code className="text-xs">INSERT INTO schema_migrations (version) VALUES ('{selectedMigration}');</code></li>
              </ol>
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
            <Button
              variant="outline"
              onClick={() => {
                const markAsAppliedSql = `INSERT INTO schema_migrations (version) VALUES ('${selectedMigration}') ON CONFLICT (version) DO NOTHING;`;
                navigator.clipboard.writeText(markAsAppliedSql);
                toast({
                  title: "Copied!",
                  description: "Mark-as-applied SQL copied to clipboard",
                });
              }}
            >
              Copy "Mark as Applied" SQL
            </Button>
            <Button onClick={openSupabaseSqlEditor} variant="default">
              Open Backend SQL Editor
            </Button>
            <Button onClick={() => setSelectedMigration(null)} variant="secondary">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Migrations;
