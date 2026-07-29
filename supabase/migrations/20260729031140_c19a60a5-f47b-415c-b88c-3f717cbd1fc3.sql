CREATE TABLE public.deleted_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  deleted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX deleted_products_title_category_key
  ON public.deleted_products (lower(title), category);

GRANT SELECT, INSERT, DELETE ON public.deleted_products TO authenticated;
GRANT ALL ON public.deleted_products TO service_role;

ALTER TABLE public.deleted_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted products" ON public.deleted_products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add deleted products" ON public.deleted_products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can remove deleted products" ON public.deleted_products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
