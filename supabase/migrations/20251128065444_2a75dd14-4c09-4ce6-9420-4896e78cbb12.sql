-- =============================================
-- MULTI-TENANT ARCHITECTURE MIGRATION (Part 2)
-- Add tenant_id to all data tables
-- =============================================

-- Add tenant_id columns
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cloud_networks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.directory_users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.group_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.hardware_inventory ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.internet_connectivity ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.job_update_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.network_devices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.network_diagrams ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.provider_emails ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.remote_clients ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.remote_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shared_files ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shared_folder_files ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shared_folder_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shared_folders ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.software_inventory ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.ticket_time_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_group_members ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_groups ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.vpn_rdp_credentials ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Create indexes for tenant_id columns
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON public.assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant ON public.chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloud_networks_tenant ON public.cloud_networks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant ON public.crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant ON public.crm_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON public.crm_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant ON public.crm_deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_directory_users_tenant ON public.directory_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hardware_inventory_tenant ON public.hardware_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant ON public.import_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_internet_connectivity_tenant ON public.internet_connectivity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON public.licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_network_devices_tenant ON public.network_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_network_diagrams_tenant ON public.network_diagrams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON public.tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_tenant ON public.user_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vpn_rdp_credentials_tenant ON public.vpn_rdp_credentials(tenant_id);