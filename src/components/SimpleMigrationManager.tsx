import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, AlertCircle, Loader2, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MigrationStatus {
  filename: string;
  applied: boolean;
  sqlUrl: string;
}

// List of all migration files (this should match what's in supabase/migrations/)
const ALL_MIGRATION_FILES = [
  "20251100000000_create_schema_migrations_table.sql", // Must be run FIRST
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

  "20251112135110_restore_admin_role_for_craig.sql",
  "20251112151903_auto_assign_admin_role.sql",

  "20251112170113_create_new_admin_account.sql",
  "20251112172925_add_admin_zerobitone_to_auto_admin.sql",

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
  "verify_admin_roles.sql",
];

const GITHUB_REPO = "craigfelt/oricol-ticket-flow-4084ab4c";
const GITHUB_BRANCH = "main";

export const SimpleMigrationManager = () => {
  const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      // First, ensure the schema_migrations table exists
      const { data: tableCheckData, error: tableCheckError } = await supabase
        .from('schema_migrations' as any)
        .select('version')
        .limit(1);

      // If table doesn't exist, show all as pending
      // PostgREST returns different error codes depending on the situation:
      // - PGRST116: relation does not exist (when using PostgREST)
      // - 42P01: undefined_table (PostgreSQL error code)
      // - Or the error might be null but data is also null (404 case)
      if (tableCheckError || (tableCheckData === null && tableCheckError === null)) {
        console.log('schema_migrations table does not exist - all migrations pending');
        console.log('Table check error:', tableCheckError);
        setIsFirstTimeSetup(true);
        const allPending = ALL_MIGRATION_FILES.map(filename => ({
          filename,
          applied: false,
          sqlUrl: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/supabase/migrations/${filename}`
        }));
        setMigrations(allPending);
        setLoading(false);
        return;
      }

      // Table exists, so this is not first time setup
      setIsFirstTimeSetup(false);

      // Get list of applied migrations
      const { data: appliedMigrations, error } = await supabase
        .from('schema_migrations' as any)
        .select('version');

      if (error) {
        throw error;
      }

      const appliedVersions = new Set(
        (appliedMigrations || []).map((m: any) => m.version)
      );

      // Build migration list with status
      const migrationList = ALL_MIGRATION_FILES.map((filename) => {
        const version = filename.replace('.sql', '');
        return {
          filename,
          applied: appliedVersions.has(version),
          sqlUrl: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/supabase/migrations/${filename}`
        };
      });

      setMigrations(migrationList);
    } catch (error: any) {
      console.error('Failed to check migrations:', error);
      toast({
        title: "Error",
        description: "Failed to check migration status. See console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const openSupabaseSQL = () => {
    // Extract project ID from SUPABASE_URL if available
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectId = projectIdMatch ? projectIdMatch[1] : 'YOUR_PROJECT_ID';
    
    window.open(`https://supabase.com/dashboard/project/${projectId}/sql`, '_blank');
  };

  const pendingMigrations = migrations.filter(m => !m.applied);
  const appliedCount = migrations.filter(m => m.applied).length;
  const pendingCount = pendingMigrations.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Database Migrations (Manual Mode)</CardTitle>
              <CardDescription>Copy & paste SQL into Supabase SQL Editor</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkMigrationStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              <strong>{appliedCount}</strong> Applied
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              <strong>{pendingCount}</strong> Pending
            </span>
          </div>
        </div>

        {/* Instructions Alert */}
        {isFirstTimeSetup && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-blue-900">
                  🚀 First-Time Setup Required
                </p>
                <p className="text-sm text-blue-800">
                  The migration tracking table needs to be created before you can apply migrations.
                </p>
                <div className="bg-black/5 p-3 rounded text-xs font-mono overflow-x-auto">
                  CREATE TABLE IF NOT EXISTS schema_migrations (<br/>
                  &nbsp;&nbsp;version text PRIMARY KEY,<br/>
                  &nbsp;&nbsp;applied_at timestamptz DEFAULT now()<br/>
                  );
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(
                      `CREATE TABLE IF NOT EXISTS schema_migrations (\n  version text PRIMARY KEY,\n  applied_at timestamptz DEFAULT now()\n);`,
                      "Create table SQL"
                    )}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy SQL
                  </Button>
                  <Button
                    size="sm"
                    onClick={openSupabaseSQL}
                    className="gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Supabase SQL Editor
                  </Button>
                </div>
                <p className="text-xs text-blue-700">
                  After running this SQL, click "Refresh" above to continue with migrations.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {pendingCount > 0 && !isFirstTimeSetup && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  {pendingCount} migration{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} to be applied manually
                </p>
                <p className="text-sm">
                  Click on a pending migration below to get the SQL and instructions
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openSupabaseSQL}
                  className="gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Supabase SQL Editor
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Migration list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : migrations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No migrations found
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {migrations.map((migration) => (
              <div key={migration.filename}>
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer ${
                    selectedMigration === migration.filename ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedMigration(
                    selectedMigration === migration.filename ? null : migration.filename
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {migration.applied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono truncate" title={migration.filename}>
                        {migration.filename}
                      </p>
                    </div>
                  </div>
                  <Badge variant={migration.applied ? "default" : "secondary"}>
                    {migration.applied ? "Applied" : "Pending"}
                  </Badge>
                </div>

                {/* Expanded instructions for pending migrations */}
                {selectedMigration === migration.filename && !migration.applied && (
                  <div className="mt-2 p-4 bg-muted/50 rounded-lg space-y-3 border-l-4 border-primary">
                    <p className="text-sm font-semibold">How to apply this migration:</p>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Step 1: Get the SQL</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(migration.sqlUrl, '_blank')}
                          className="gap-2 flex-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View SQL on GitHub
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(migration.sqlUrl, "GitHub URL")}
                          className="gap-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copy URL
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Step 2: Run in Supabase SQL Editor</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                        <li>Open the SQL file from GitHub (button above)</li>
                        <li>Copy all the SQL content (Ctrl+A, Ctrl+C)</li>
                        <li>Open Supabase SQL Editor (button below)</li>
                        <li>Paste the SQL and click "Run" (or press F5)</li>
                      </ol>
                      <Button
                        size="sm"
                        onClick={openSupabaseSQL}
                        className="gap-2 w-full"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Supabase SQL Editor
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Step 3: Mark as applied</p>
                      <div className="bg-black/5 p-2 rounded text-xs font-mono">
                        INSERT INTO schema_migrations (version)<br/>
                        VALUES ('{migration.filename.replace('.sql', '')}')<br/>
                        ON CONFLICT (version) DO NOTHING;
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(
                          `INSERT INTO schema_migrations (version) VALUES ('${migration.filename.replace('.sql', '')}') ON CONFLICT (version) DO NOTHING;`,
                          "Mark as applied SQL"
                        )}
                        className="gap-2 w-full"
                      >
                        <Copy className="h-3 w-3" />
                        Copy "Mark as Applied" SQL
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground italic">
                      After running both SQLs, click "Refresh" above to update the status
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info text */}
        <p className="text-xs text-muted-foreground">
          💡 This manual mode works on Lovable. Migrations must be applied via Supabase SQL Editor.
          Click on any pending migration for step-by-step instructions.
        </p>
      </CardContent>
    </Card>
  );
};
