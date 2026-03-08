
-- Add display_order column to platforms
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Set initial display_order based on name
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.platforms
)
UPDATE public.platforms SET display_order = ordered.rn
FROM ordered WHERE platforms.id = ordered.id;

-- Allow authenticated users to manage platforms
CREATE POLICY "Authenticated users can insert platforms"
ON public.platforms FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update platforms"
ON public.platforms FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete platforms"
ON public.platforms FOR DELETE TO authenticated
USING (true);
