CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  image_url text NOT NULL DEFAULT '' CHECK (char_length(image_url) <= 2048),
  link_url text NOT NULL DEFAULT '' CHECK (char_length(link_url) <= 2048),
  placement text NOT NULL DEFAULT 'header' CHECK (placement IN ('header', 'home', 'tournament')),
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT advertisements_date_order CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advertisements public read"
ON public.advertisements
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "advertisements admin insert"
ON public.advertisements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "advertisements admin update"
ON public.advertisements
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "advertisements admin delete"
ON public.advertisements
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_advertisements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.set_advertisements_updated_at();