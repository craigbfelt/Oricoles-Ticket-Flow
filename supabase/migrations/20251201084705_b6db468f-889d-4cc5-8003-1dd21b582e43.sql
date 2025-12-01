-- Create a default tenant for existing data
INSERT INTO tenants (id, name, slug, is_active, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  true,
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Assign all existing users to the default tenant as admins
INSERT INTO user_tenant_memberships (user_id, tenant_id, role)
SELECT 
  p.user_id,
  '00000000-0000-0000-0000-000000000001',
  'admin'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_tenant_memberships utm 
  WHERE utm.user_id = p.user_id 
    AND utm.tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- Update all existing data to belong to default tenant
UPDATE tickets SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE assets SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE branches SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE hardware_inventory SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE software_inventory SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE licenses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE jobs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE maintenance_requests SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE documents SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE crm_companies SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE crm_contacts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE crm_deals SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE crm_activities SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE chat_messages SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE network_devices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE network_diagrams SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE internet_connectivity SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE vpn_rdp_credentials SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE remote_sessions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE remote_clients SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE provider_emails SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE directory_users SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE import_jobs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE job_update_requests SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE cloud_networks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;