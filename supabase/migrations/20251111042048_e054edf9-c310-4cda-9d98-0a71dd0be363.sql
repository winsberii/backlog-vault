-- Create table for number of players templates
CREATE TABLE public.number_of_players_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  display_order integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.number_of_players_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Templates are publicly readable"
ON public.number_of_players_templates
FOR SELECT
USING (true);

-- Insert common number of players values
INSERT INTO public.number_of_players_templates (value, display_order) VALUES
  ('1', 1),
  ('1-2', 2),
  ('1-4', 3),
  ('2', 4),
  ('2-4', 5),
  ('2-8', 6),
  ('4', 7),
  ('4+', 8),
  ('Multiplayer', 9);