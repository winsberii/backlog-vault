CREATE TABLE public.resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolutions TO authenticated;
GRANT SELECT ON public.resolutions TO anon;
GRANT ALL ON public.resolutions TO service_role;

ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resolutions are publicly readable" ON public.resolutions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert resolutions" ON public.resolutions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update resolutions" ON public.resolutions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete resolutions" ON public.resolutions FOR DELETE TO authenticated USING (true);

ALTER TABLE public.games ADD COLUMN resolution uuid REFERENCES public.resolutions(id) ON DELETE SET NULL;

INSERT INTO public.resolutions (name, display_order) VALUES
  ('720p', 1), ('1080p', 2), ('1440p', 3), ('4K', 4);