-- =============================================
-- MULTI-TENANT RLS POLICIES (Part 3)
-- =============================================

-- TICKETS
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Only admins can delete tickets" ON public.tickets;
DROP POLICY IF EXISTS "Ticket owners, assignees, staff, and admins can update" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets, assignees, or if admin" ON public.tickets;

CREATE POLICY "tenant_tickets_select" ON public.tickets FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR 
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_tickets_insert" ON public.tickets FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_tickets_update" ON public.tickets FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR 
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_tickets_delete" ON public.tickets FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- ASSETS
DROP POLICY IF EXISTS "Authenticated users can create assets" ON public.assets;
DROP POLICY IF EXISTS "Only admins can delete assets" ON public.assets;
DROP POLICY IF EXISTS "Only staff can update assets" ON public.assets;
DROP POLICY IF EXISTS "Only staff can view assets" ON public.assets;

CREATE POLICY "tenant_assets_select" ON public.assets FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_assets_insert" ON public.assets FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_assets_update" ON public.assets FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_assets_delete" ON public.assets FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- BRANCHES
DROP POLICY IF EXISTS "Authenticated users can create branches" ON public.branches;
DROP POLICY IF EXISTS "Authenticated users can view all branches" ON public.branches;
DROP POLICY IF EXISTS "Only admins can delete branches" ON public.branches;
DROP POLICY IF EXISTS "Only admins can update branches" ON public.branches;

CREATE POLICY "tenant_branches_select" ON public.branches FOR SELECT USING (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_branches_insert" ON public.branches FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_branches_update" ON public.branches FOR UPDATE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

CREATE POLICY "tenant_branches_delete" ON public.branches FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- HARDWARE INVENTORY
DROP POLICY IF EXISTS "Authenticated users can create hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Only admins can delete hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Only staff can update hardware" ON public.hardware_inventory;
DROP POLICY IF EXISTS "Only staff can view hardware" ON public.hardware_inventory;

CREATE POLICY "tenant_hardware_select" ON public.hardware_inventory FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_hardware_insert" ON public.hardware_inventory FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_hardware_update" ON public.hardware_inventory FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_hardware_delete" ON public.hardware_inventory FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- LICENSES
DROP POLICY IF EXISTS "Admins can delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "Authenticated users can create licenses" ON public.licenses;
DROP POLICY IF EXISTS "Staff can update licenses" ON public.licenses;
DROP POLICY IF EXISTS "Staff can view licenses" ON public.licenses;

CREATE POLICY "tenant_licenses_select" ON public.licenses FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_licenses_insert" ON public.licenses FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_licenses_update" ON public.licenses FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_licenses_delete" ON public.licenses FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- JOBS
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;

CREATE POLICY "tenant_jobs_select" ON public.jobs FOR SELECT USING (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_jobs_insert" ON public.jobs FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_jobs_update" ON public.jobs FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_jobs_delete" ON public.jobs FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);

-- CRM COMPANIES
DROP POLICY IF EXISTS "Admins can delete companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.crm_companies;

CREATE POLICY "tenant_crm_companies_select" ON public.crm_companies FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_companies_insert" ON public.crm_companies FOR INSERT WITH CHECK (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_companies_update" ON public.crm_companies FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_companies_delete" ON public.crm_companies FOR DELETE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

-- CRM CONTACTS
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can insert contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can update contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.crm_contacts;

CREATE POLICY "tenant_crm_contacts_select" ON public.crm_contacts FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_contacts_insert" ON public.crm_contacts FOR INSERT WITH CHECK (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_contacts_update" ON public.crm_contacts FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_contacts_delete" ON public.crm_contacts FOR DELETE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

-- CRM DEALS
DROP POLICY IF EXISTS "Admins can delete deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Admins can insert deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Admins can update deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Admins can view all deals" ON public.crm_deals;

CREATE POLICY "tenant_crm_deals_select" ON public.crm_deals FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_deals_insert" ON public.crm_deals FOR INSERT WITH CHECK (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_deals_update" ON public.crm_deals FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_deals_delete" ON public.crm_deals FOR DELETE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

-- CRM ACTIVITIES
DROP POLICY IF EXISTS "Admins can delete activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Admins can update activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Admins can view all activities" ON public.crm_activities;

CREATE POLICY "tenant_crm_activities_select" ON public.crm_activities FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_activities_insert" ON public.crm_activities FOR INSERT WITH CHECK (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_activities_update" ON public.crm_activities FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

CREATE POLICY "tenant_crm_activities_delete" ON public.crm_activities FOR DELETE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, 'admin'))
);

-- DOCUMENTS
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.documents;
DROP POLICY IF EXISTS "Document owners and admins can delete" ON public.documents;
DROP POLICY IF EXISTS "Document owners and admins can update" ON public.documents;
DROP POLICY IF EXISTS "Users can view own documents or if admin" ON public.documents;

CREATE POLICY "tenant_documents_select" ON public.documents FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    auth.uid() = uploaded_by OR
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_documents_insert" ON public.documents FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_documents_update" ON public.documents FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    auth.uid() = uploaded_by OR public.has_tenant_role(tenant_id, 'admin')
  ))
);

CREATE POLICY "tenant_documents_delete" ON public.documents FOR DELETE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    auth.uid() = uploaded_by OR public.has_tenant_role(tenant_id, 'admin')
  ))
);

-- MAINTENANCE REQUESTS
DROP POLICY IF EXISTS "Authenticated users can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Only admins can delete maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update own requests or if staff" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can view own maintenance requests or if staff" ON public.maintenance_requests;

CREATE POLICY "tenant_maintenance_select" ON public.maintenance_requests FOR SELECT USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    requested_by = auth.uid() OR
    assigned_to = auth.uid() OR
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_maintenance_insert" ON public.maintenance_requests FOR INSERT WITH CHECK (
  public.is_super_admin() OR tenant_id = ANY(public.get_user_tenant_ids())
);

CREATE POLICY "tenant_maintenance_update" ON public.maintenance_requests FOR UPDATE USING (
  public.is_super_admin() OR 
  (tenant_id = ANY(public.get_user_tenant_ids()) AND (
    requested_by = auth.uid() OR
    assigned_to = auth.uid() OR
    public.has_tenant_role(tenant_id, 'admin') OR 
    public.has_tenant_role(tenant_id, 'support_staff')
  ))
);

CREATE POLICY "tenant_maintenance_delete" ON public.maintenance_requests FOR DELETE USING (
  public.is_super_admin() OR public.has_tenant_role(tenant_id, 'admin')
);