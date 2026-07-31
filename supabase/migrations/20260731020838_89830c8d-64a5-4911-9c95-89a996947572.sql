-- Replace the old wide-open guest upload rule with folder-scoped rules.
DROP POLICY IF EXISTS "order_inspo_anon_insert" ON storage.objects;

-- Guests: upload + read back ONLY inside pending/
CREATE POLICY "order_inspo_anon_insert_pending"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'order-inspo'
  AND (storage.foldername(name))[1] = 'pending'
  AND array_length(storage.foldername(name), 1) = 1
);

CREATE POLICY "order_inspo_anon_select_pending"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'order-inspo'
  AND (storage.foldername(name))[1] = 'pending'
);

-- Signed-in users: pending/ plus their own u/<uid>/ folder
CREATE POLICY "order_inspo_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-inspo'
  AND (
    (
      (storage.foldername(name))[1] = 'pending'
      AND array_length(storage.foldername(name), 1) = 1
    )
    OR (
      (storage.foldername(name))[1] = 'u'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = 'orders'
  )
);

CREATE POLICY "order_inspo_auth_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-inspo'
  AND (
    (storage.foldername(name))[1] = 'pending'
    OR (
      (storage.foldername(name))[1] = 'u'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Order attachments written by the guest checkout flow
CREATE POLICY "order_inspo_anon_insert_orders"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'order-inspo'
  AND (storage.foldername(name))[1] = 'orders'
  AND array_length(storage.foldername(name), 1) = 2
);

CREATE POLICY "order_inspo_anon_select_orders"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'order-inspo'
  AND (storage.foldername(name))[1] = 'orders'
);

-- Owner/admin: full control over the whole bucket
CREATE POLICY "order_inspo_admin_all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'order-inspo' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'order-inspo' AND public.has_role(auth.uid(), 'admin'::app_role));
