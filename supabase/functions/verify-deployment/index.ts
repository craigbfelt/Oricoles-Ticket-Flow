import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

/**
 * Edge Function to verify Supabase deployment status
 * 
 * This function performs a comprehensive health check:
 * 1. Checks that all migrations have been applied successfully
 * 2. Verifies that all expected edge functions are deployed
 * 3. Returns a detailed status report
 * 
 * Usage:
 *   GET /functions/v1/verify-deployment
 * 
 * Returns:
 *   - success: boolean indicating overall health
 *   - migrations: status of database migrations
 *   - edgeFunctions: status of edge function deployments
 *   - summary: human-readable summary
 */

// Expected migrations list - updated when new migrations are added
const EXPECTED_MIGRATIONS = [
  "20251100000000_create_schema_migrations_table",
  "20251108052000_bee9ee20-5a81-402a-bdd9-30cce8e8ecb7",
  "20251109045855_6a7fc76b-c088-4052-a67d-5471bc1cf984",
  "20251110192108_fab519ce-aecd-4771-8ff3-cb79de2cbe7d",
  "20251111085548_c85ce8a8-0f94-4670-b767-004b83f996e9",
  "20251111100012_f27546a6-3183-40a6-a659-83c56f6d07ec",
  "20251111100704_b5302bee-33a3-4f14-84b4-8379994bdfca",
  "20251111101518_6f9cb181-efcb-451b-8330-83e60e79ae67",
  "20251111101727_5d0600ca-2ad2-42ba-b7fb-a8167a3f7ed6",
  "20251111103503_2849fa7c-b530-45e3-9863-f6c6f4e2b98c",
  "20251111111220_5d9f7f4b-d8b4-4f91-837b-9e306e9a8e14",
  "20251111135922_f7475cb1-896e-428c-9441-fa5f9a9d3b44",
  "20251111140343_ee4c7cca-e087-4f12-98f3-4340e6db9c2e",
  "20251111143226_aff189ac-0a04-4e14-aa2b-3163baec918f",
  "20251111143859_3bc3791c-fd30-46f5-a40e-5cc6864df211",
  "20251112054548_cbcbc569-cc63-4810-8938-1a8d760222b0",
  "20251112060133_28a7a03c-4f93-475a-9ba1-34e238edbfc9",
  "20251112063832_f5103d15-9046-47b5-acf0-6835adf79161",
  "20251112064207_553f2a8d-2fd8-45f6-8f5b-3c7bf3f97c00",
  "20251112065350_76d95c8d-1109-46fa-8b90-e18e53a62df7",
  "20251112065604_0346015b-e2b3-4bfe-a6b5-764f8ae93e59",
  "20251112124800_add_ceo_role",
  "20251112135110_restore_admin_role_for_craig",
  "20251112151903_auto_assign_admin_role",
  "20251112160000_allow_ceo_view_all_profiles",
  "20251112161521_restore_admin_and_ceo_roles",
  "20251112170113_create_new_admin_account",
  "20251112172925_add_admin_zerobitone_to_auto_admin",
  "20251112184500_fix_ceo_permissions",
  "20251112185000_ensure_admin_roles",
  "20251112190000_verify_permissions",
  "20251112200000_ensure_craig_has_admin_role",
  "20251112204108_remove_role_based_rls_policies",
  "20251113044109_48d68a5f-09a0-4966-a8a0-d731a7f46081",
  "20251113045637_23d17770-5ebe-4fab-88bf-62c6fd1e5174",
  "20251113052200_create_import_and_network_tables",
  "20251113111200_create_diagrams_storage_bucket",
  "20251113141553_fd4f94c4-56b6-4b7e-84ae-6ef1a6fe28dd",
  "20251113142600_create_documents_table_and_bucket",
  "20251113144620_94ba20be-061a-4db7-ab47-d97e1a65f50e",
  "20251113144637_6121518f-7da2-4788-84aa-e49a9edd5f75",
  "20251113144706_84dc8187-e186-41a5-8010-daeb2d30f43d",
  "20251113151700_fix_documents_storage_policies",
  "20251113153200_fix_documents_table_rls_policies",
  "20251113232600_comprehensive_rls_fix",
  "20251114045447_aad8c850-8bf9-4f87-b922-e70dab761b14",
  "20251115133000_verify_and_fix_lovable_rls",
  "20251116070158_63eef662-012a-4e49-8b96-4593cca7ae1b",
  "20251116081115_fix_network_diagrams_branch_id_nullable",
  "20251116112700_enhance_user_profiles_and_document_hub",
  "20251116114500_add_ticket_tracking_fields",
  "20251116134300_fix_admin_full_access",
  "20251116134400_create_user_groups_and_file_sharing",
  "20251116134500_create_user_import_functions",
  "20251117000000_create_shared_files_system",
  "20251117102836_e9e402df-9138-41a1-874c-39dc729c3cbd",
  "20251117131300_fix_shared_folders_dependencies",
  "20251118031628_a1b4b539-b26d-419f-93d1-5a8e855ce824",
  "20251119034817_f3a7a9e8-59e4-44e1-855e-a349b498bdb2",
  "20251119050102_87ec93cb-5d13-4ff1-bc63-02721e798d75",
  "20251119052800_fix_security_definer_search_path",
  "20251119055823_backfill_missing_profiles",
  "20251119080900_create_crm_system",
  "20251120034137_82d09dde-5c06-48eb-a16f-a8f05a77a665",
  "20251121135608_b4742fd0-0997-4eca-92bc-6f7359088a9a",
  "20251125043624_3832ff4e-7cb0-41c5-bbd8-139612b4630d",
  "20251125120719_4669bb48-a07d-4bdd-a3af-a70878479126",
  "20251125120804_3dead9ea-ccb9-45d6-82fe-f90dc4b16f54",
  "20251127042925_d8b9922d-4a30-4dcb-a069-78326baa759c",
  "20251127135451_970a01d1-c7c5-4c47-851d-9895086ca558",
  "20251128065421_b64e7524-58c6-4032-90cc-0a004006bace",
  "20251128065444_2a75dd14-4c09-4ce6-9420-4896e78cbb12",
  "20251128065528_ffe2c720-4724-40cf-9485-b3b9b99406a7",
  "20251201084705_b6db468f-889d-4cc5-8003-1dd21b582e43",
  "20251203134210_fix_user_roles_rls_recursion",
  "20251204151925_add_m365_columns_to_hardware_inventory",
  "20251205000000_secure_credential_storage",
];

// Expected edge functions list - updated when new functions are added
const EXPECTED_EDGE_FUNCTIONS = [
  "check-migrations",
  "confirm-provider-task",
  "import-staff-users",
  "m365-ediscovery-search",
  "manage-user-roles",
  "mark-migrations-applied",
  "notify-ticket-assignment",
  "register-remote-client",
  "resend-provider-email",
  "reset-user-password",
  "route-ticket-email",
  "send-staff-onboarding-email",
  "send-ticket-reminders",
  "storage-admin-operations",
  "sync-microsoft-365",
  "verify-deployment",
];

interface MigrationRecord {
  version: string;
  applied_at: string;
}

interface MigrationStatus {
  version: string;
  filename: string;
  applied: boolean;
  appliedAt?: string;
}

interface EdgeFunctionStatus {
  name: string;
  deployed: boolean;
  lastChecked: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check migration status
    const appliedMigrations = new Map<string, string>();
    const { data: migrationData, error: migrationError } = await supabaseClient
      .from('schema_migrations')
      .select('version, applied_at');

    if (!migrationError && migrationData) {
      migrationData.forEach((m: MigrationRecord) => {
        appliedMigrations.set(m.version, m.applied_at);
      });
    }

    // Build migration status report
    const migrationStatuses: MigrationStatus[] = EXPECTED_MIGRATIONS.map((version) => ({
      version,
      filename: `${version}.sql`,
      applied: appliedMigrations.has(version),
      appliedAt: appliedMigrations.get(version),
    }));

    const appliedCount = migrationStatuses.filter(m => m.applied).length;
    const pendingCount = migrationStatuses.filter(m => !m.applied).length;
    const migrationsHealthy = pendingCount === 0;

    // Check edge functions deployment status
    // We verify edge functions by making a lightweight OPTIONS request to each
    const edgeFunctionStatuses: EdgeFunctionStatus[] = [];
    const functionsUrl = `${supabaseUrl}/functions/v1`;

    for (const funcName of EXPECTED_EDGE_FUNCTIONS) {
      try {
        // Try to reach the function's OPTIONS endpoint
        const response = await fetch(`${functionsUrl}/${funcName}`, {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        // A function is considered deployed if it returns any response (including 401/403)
        // Functions that don't exist return 404
        const deployed = response.status !== 404;
        
        edgeFunctionStatuses.push({
          name: funcName,
          deployed,
          lastChecked: new Date().toISOString(),
        });
      } catch {
        // Network error or function doesn't exist
        edgeFunctionStatuses.push({
          name: funcName,
          deployed: false,
          lastChecked: new Date().toISOString(),
        });
      }
    }

    const deployedFunctionsCount = edgeFunctionStatuses.filter(f => f.deployed).length;
    const notDeployedFunctionsCount = edgeFunctionStatuses.filter(f => !f.deployed).length;
    const edgeFunctionsHealthy = notDeployedFunctionsCount === 0;

    // Overall health check
    const overallHealthy = migrationsHealthy && edgeFunctionsHealthy;

    // Build summary
    const summaryParts: string[] = [];
    if (migrationsHealthy) {
      summaryParts.push(`✅ All ${appliedCount} migrations applied`);
    } else {
      summaryParts.push(`⚠️ ${pendingCount} pending migrations`);
    }
    if (edgeFunctionsHealthy) {
      summaryParts.push(`✅ All ${deployedFunctionsCount} edge functions deployed`);
    } else {
      summaryParts.push(`⚠️ ${notDeployedFunctionsCount} edge functions not deployed`);
    }

    const response = {
      success: overallHealthy,
      timestamp: new Date().toISOString(),
      summary: summaryParts.join(' | '),
      migrations: {
        healthy: migrationsHealthy,
        total: EXPECTED_MIGRATIONS.length,
        applied: appliedCount,
        pending: pendingCount,
        details: migrationStatuses,
      },
      edgeFunctions: {
        healthy: edgeFunctionsHealthy,
        total: EXPECTED_EDGE_FUNCTIONS.length,
        deployed: deployedFunctionsCount,
        notDeployed: notDeployedFunctionsCount,
        details: edgeFunctionStatuses,
      },
      notes: [
        "Migrations are automatically applied when you push to main branch via GitHub Actions.",
        "Edge functions are deployed via the deploy-changed-edge-functions.yml workflow.",
        "Use 'supabase db push' to manually apply pending migrations.",
        "Use 'supabase functions deploy <function-name>' to manually deploy edge functions.",
      ],
    };

    return new Response(
      JSON.stringify(response, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error verifying deployment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with success: false to avoid FunctionsHttpError on client
      }
    );
  }
});
