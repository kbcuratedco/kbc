CREATE POLICY "Public can view product photos" ON storage.objects
    FOR SELECT TO anon USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can view product photos" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'products');

CREATE POLICY "Admins can upload product photos" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'products'
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can update product photos" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'products'
        AND public.has_role(auth.uid(), 'admin')
    ) WITH CHECK (
        bucket_id = 'products'
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can delete product photos" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'products'
        AND public.has_role(auth.uid(), 'admin')
    );