-- Fix all error-level security issues with RLS policies

-- ============================================
-- 1. FIX PROFILES TABLE - Restrict email access
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create restricted policy: Users can only view their own profile, admins can view all
CREATE POLICY "Users can view own profile, admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. FIX TICKETS TABLE - Restrict access to owners/assignees/admins
-- ============================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all tickets" ON public.tickets;

-- Create restricted SELECT policy
CREATE POLICY "Users can view own tickets, assignees, or if admin"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'support_staff')
  );

-- Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.tickets;

-- Create restricted UPDATE policy
CREATE POLICY "Ticket owners, assignees, staff, and admins can update"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'support_staff')
  );

-- Drop overly permissive DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete tickets" ON public.tickets;

-- Create restricted DELETE policy (only admins can delete)
CREATE POLICY "Only admins can delete tickets"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. FIX DOCUMENTS TABLE - Restrict to owners and admins
-- ============================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all documents" ON public.documents;

-- Create restricted SELECT policy
CREATE POLICY "Users can view own documents or if admin"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = uploaded_by OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'support_staff')
  );

-- Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;

-- Create restricted UPDATE policy
CREATE POLICY "Document owners and admins can update"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = uploaded_by OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Drop overly permissive DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;

-- Create restricted DELETE policy
CREATE POLICY "Document owners and admins can delete"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by OR 
    public.has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 4. FIX IMPORT_JOBS TABLE - Restrict to owners and admins
-- ============================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all import jobs" ON public.import_jobs;

-- Create restricted SELECT policy
CREATE POLICY "Users can view own import jobs or if admin"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = uploader OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'support_staff')
  );

-- Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update import jobs" ON public.import_jobs;

-- Create restricted UPDATE policy
CREATE POLICY "Import job owners and admins can update"
  ON public.import_jobs FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = uploader OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Drop overly permissive DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete import jobs" ON public.import_jobs;

-- Create restricted DELETE policy
CREATE POLICY "Only admins can delete import jobs"
  ON public.import_jobs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));