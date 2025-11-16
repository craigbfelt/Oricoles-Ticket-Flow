-- Clean up any existing storage policies for documents/diagrams
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%documents%'
        OR policyname ILIKE '%diagrams%'
        OR policyname IN (
          'storage_service_role_full',
          'storage_select_owner',
          'storage_insert_owner',
          'storage_update_owner',
          'storage_delete_owner'
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END$$;

-- Recreate explicit policies per bucket
CREATE POLICY "documents_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'documents');

CREATE POLICY "documents_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "diagrams_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "diagrams_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'diagrams');

CREATE POLICY "diagrams_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'diagrams')
  WITH CHECK (bucket_id = 'diagrams');

CREATE POLICY "diagrams_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'diagrams');