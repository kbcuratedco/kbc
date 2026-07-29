CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table (separate from auth.users per security rules)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage roles" ON public.user_roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Security definer helper to check roles without recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Products table (cloud-persisted catalog)
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text NOT NULL CHECK (category IN ('stationery', 'banner', 'sports')),
    price numeric NOT NULL CHECK (price >= 0),
    description text,
    images text[] NOT NULL DEFAULT '{}',
    active boolean DEFAULT true NOT NULL,
    free_shipping boolean DEFAULT false,
    digital boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public shoppers can only see active products
CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT TO anon USING (active = true);

-- Authenticated shoppers can also only see active products
CREATE POLICY "Authenticated users can view active products" ON public.products
    FOR SELECT TO authenticated USING (active = true);

-- Admins can see all products including inactive
CREATE POLICY "Admins can view all products" ON public.products
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert products
CREATE POLICY "Admins can insert products" ON public.products
    FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update products
CREATE POLICY "Admins can update products" ON public.products
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete products
CREATE POLICY "Admins can delete products" ON public.products
    FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the catalog from the existing hardcoded PRODUCTS list
INSERT INTO public.products (title, category, price, description, images, active, free_shipping, digital, sort_order)
VALUES
    ('Boys Custom Stationery Set', 'stationery', 25, 'Variety notecards, 24 count. Hand-drawn designs for the little gentleman in your life.', ARRAY['https://i.etsystatic.com/64278780/r/il/7300eb/8095917575/il_340x270.8095917575_jem6.jpg'], true, true, false, 10),
    ('Girls Custom Stationery Set', 'stationery', 25, 'Variety notecards, 24 count. Playful hand-painted florals & motifs.', ARRAY['https://i.etsystatic.com/64278780/r/il/9ec395/8045499826/il_340x270.8045499826_20wf.jpg'], true, true, false, 11),
    ('Lemon Notecards', 'stationery', 25, 'Custom stationery set, 24 count. Sun-kissed lemon watercolors.', ARRAY['https://i.etsystatic.com/64278780/r/il/eacdf3/8093412077/il_340x270.8093412077_qsc0.jpg'], true, true, false, 12),
    ('Girl Bow Notecards', 'stationery', 25, 'Custom girl stationery set, 24 count. Sweet hand-drawn bows.', ARRAY['https://i.etsystatic.com/64278780/r/il/390c0a/8095919521/il_340x270.8095919521_j99t.jpg'], true, true, false, 13),
    ('Summer Camp Keep-in-Touch Card', 'stationery', 7, 'Digital download template for camp letters home.', ARRAY['https://i.etsystatic.com/64278780/r/il/bc48db/8216413186/il_340x270.8216413186_t3bf.jpg'], true, false, true, 14),
    ('Birthday Banner', 'banner', 45, 'Hand-painted birthday banner, made to your theme and colors.', ARRAY['https://i.etsystatic.com/64278780/r/il/4c62c2/8080686983/il_340x270.8080686983_8yy8.jpg'], true, true, false, 20),
    ('Holiday Banner', 'banner', 45, 'Custom holiday banner painted by hand for your celebration.', ARRAY['https://i.etsystatic.com/64278780/r/il/5a347a/7641111754/il_340x270.7641111754_15hw.jpg'], true, true, false, 21),
    ('School Banner', 'banner', 45, 'Back-to-school or milestone banner, personalized for your student.', ARRAY['https://i.etsystatic.com/64278780/r/il/1ab0f9/8080691361/il_340x270.8080691361_jcep.jpg'], true, true, false, 22),
    ('Game Day Banner', 'banner', 45, 'Bring on the spirit — banner in your team''s colors and logos.', ARRAY['https://i.etsystatic.com/64278780/r/il/ce2052/8080688947/il_340x270.8080688947_csdy.jpg'], true, true, false, 23),
    ('School''s Out Banner', 'banner', 45, 'End-of-school celebration banner, hand-painted just for the graduate.', ARRAY['https://i.etsystatic.com/64278780/r/il/7760f0/8080693701/il_340x270.8080693701_ec2w.jpg'], true, true, false, 24),
    ('Custom Hand-Painted Sports Balls', 'sports', 25, 'Baseballs, softballs & more — painted by hand for your team.', ARRAY['https://i.etsystatic.com/64278780/r/il/7af67e/8080579409/il_340x270.8080579409_tass.jpg'], true, false, false, 30),
    ('Custom Hand-Painted Volleyballs', 'sports', 55, 'Regulation volleyballs hand-painted with player name, number, and team art.', ARRAY['https://i.etsystatic.com/64278780/r/il/d61c60/7641170266/il_340x270.7641170266_9iw1.jpg'], true, true, false, 31),
    ('Custom Hand-Painted Footballs', 'sports', 89.99, 'Full-size footballs, hand-painted with your player''s design.', ARRAY['https://i.etsystatic.com/64278780/r/il/01da70/7689099693/il_340x270.7689099693_ot3i.jpg'], true, true, false, 32);