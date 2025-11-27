-- =====================================================
-- SECURITY FIX: Restrict Overly Permissive RLS Policies
-- =====================================================

-- 1. DIRECTORY_USERS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all directory users" ON directory_users;
DROP POLICY IF EXISTS "Authenticated users can update directory users" ON directory_users;
DROP POLICY IF EXISTS "Authenticated users can delete directory users" ON directory_users;

CREATE POLICY "Staff can view directory users" ON directory_users
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update directory users" ON directory_users
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete directory users" ON directory_users
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. LICENSES - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all licenses" ON licenses;
DROP POLICY IF EXISTS "Authenticated users can update licenses" ON licenses;
DROP POLICY IF EXISTS "Authenticated users can delete licenses" ON licenses;

CREATE POLICY "Staff can view licenses" ON licenses
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update licenses" ON licenses
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete licenses" ON licenses
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. NETWORK_DIAGRAMS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all network diagrams" ON network_diagrams;
DROP POLICY IF EXISTS "Authenticated users can update network diagrams" ON network_diagrams;
DROP POLICY IF EXISTS "Authenticated users can delete network diagrams" ON network_diagrams;

CREATE POLICY "Staff can view network diagrams" ON network_diagrams
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update network diagrams" ON network_diagrams
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete network diagrams" ON network_diagrams
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. PROFILES - Restrict UPDATE to own profile or admin
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

CREATE POLICY "Users can update own profile or admin" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- 5. PROVIDER_EMAILS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all provider emails" ON provider_emails;
DROP POLICY IF EXISTS "Authenticated users can update provider emails" ON provider_emails;
DROP POLICY IF EXISTS "Authenticated users can delete provider emails" ON provider_emails;

CREATE POLICY "Staff can view provider emails" ON provider_emails
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update provider emails" ON provider_emails
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete provider emails" ON provider_emails
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 6. REMOTE_CLIENTS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all remote clients" ON remote_clients;
DROP POLICY IF EXISTS "Authenticated users can update remote clients" ON remote_clients;
DROP POLICY IF EXISTS "Authenticated users can delete remote clients" ON remote_clients;

CREATE POLICY "Staff can view remote clients" ON remote_clients
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update remote clients" ON remote_clients
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete remote clients" ON remote_clients
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 7. REMOTE_SESSIONS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all remote sessions" ON remote_sessions;
DROP POLICY IF EXISTS "Authenticated users can update remote sessions" ON remote_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete remote sessions" ON remote_sessions;

CREATE POLICY "Staff can view remote sessions" ON remote_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update remote sessions" ON remote_sessions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete remote sessions" ON remote_sessions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 8. SHARED_FOLDER_FILES - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view folder files" ON shared_folder_files;
DROP POLICY IF EXISTS "Authenticated users can remove folder files" ON shared_folder_files;

CREATE POLICY "Staff can view folder files" ON shared_folder_files
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can remove folder files" ON shared_folder_files
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 9. SHARED_FOLDER_PERMISSIONS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view folder perms" ON shared_folder_permissions;
DROP POLICY IF EXISTS "Authenticated users can revoke folder perms" ON shared_folder_permissions;

CREATE POLICY "Staff can view folder perms" ON shared_folder_permissions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can revoke folder perms" ON shared_folder_permissions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 10. SOFTWARE_INVENTORY - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view all software" ON software_inventory;
DROP POLICY IF EXISTS "Authenticated users can update software" ON software_inventory;
DROP POLICY IF EXISTS "Authenticated users can delete software" ON software_inventory;

CREATE POLICY "Staff can view software inventory" ON software_inventory
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update software inventory" ON software_inventory
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete software inventory" ON software_inventory
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 11. TICKET_COMMENTS - Restrict to owner/staff/admin
DROP POLICY IF EXISTS "Authenticated users can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can update comments" ON ticket_comments;
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON ticket_comments;

CREATE POLICY "Users can view ticket comments" ON ticket_comments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Users can update own comments" ON ticket_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own comments or admin" ON ticket_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- 12. TICKET_TIME_LOGS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view time logs" ON ticket_time_logs;
DROP POLICY IF EXISTS "Authenticated users can update time logs" ON ticket_time_logs;
DROP POLICY IF EXISTS "Authenticated users can delete time logs" ON ticket_time_logs;

CREATE POLICY "Staff can view time logs" ON ticket_time_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update time logs" ON ticket_time_logs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete time logs" ON ticket_time_logs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 13. USER_GROUP_MEMBERS - Restrict to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view members" ON user_group_members;
DROP POLICY IF EXISTS "Authenticated users can remove members" ON user_group_members;

CREATE POLICY "Staff can view group members" ON user_group_members
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can remove group members" ON user_group_members
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 14. VPN_RDP_CREDENTIALS - Restrict to staff/admin only (sensitive!)
DROP POLICY IF EXISTS "Authenticated users can view all credentials" ON vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can update credentials" ON vpn_rdp_credentials;
DROP POLICY IF EXISTS "Authenticated users can delete credentials" ON vpn_rdp_credentials;

CREATE POLICY "Staff can view credentials" ON vpn_rdp_credentials
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Staff can update credentials" ON vpn_rdp_credentials
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_staff'));

CREATE POLICY "Admins can delete credentials" ON vpn_rdp_credentials
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 15. MAKE STORAGE BUCKETS PRIVATE
UPDATE storage.buckets SET public = false WHERE id = 'diagrams';
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 16. Remove public storage SELECT policies and ensure authenticated-only access
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "diagrams_storage_select" ON storage.objects;