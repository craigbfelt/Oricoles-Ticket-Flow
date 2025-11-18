import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get list of applied migrations from the database
    const { data: appliedMigrations, error: migrationsError } = await supabaseClient
      .from('schema_migrations')
      .select('version');

    if (migrationsError && migrationsError.code !== 'PGRST116') {
      throw migrationsError;
    }

    const appliedVersions = new Set(
      (appliedMigrations || []).map((m: any) => m.version)
    );

    // List of migration files (hardcoded from repo - you can also fetch from GitHub API)
    const allMigrationFiles = [
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
    ];

    const migrations = allMigrationFiles.map((filename) => {
      const version = filename.replace('.sql', '');
      return {
        filename,
        applied: appliedVersions.has(version),
        appliedAt: null, // Could be fetched from schema_migrations if we store timestamps
      };
    });

    return new Response(
      JSON.stringify({ migrations }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking migrations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
