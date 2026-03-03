
-- Create stores table
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores are publicly readable"
ON public.stores FOR SELECT
USING (true);

-- Insert some common stores
INSERT INTO public.stores (name) VALUES
  ('Steam'),
  ('Epic Games Store'),
  ('GOG'),
  ('PlayStation Store'),
  ('Xbox Store'),
  ('Nintendo eShop'),
  ('Humble Bundle'),
  ('Physical'),
  ('Game Pass'),
  ('PS Plus');

-- Create junction table for game-store many-to-many
CREATE TABLE public.game_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (game_id, store_id)
);

ALTER TABLE public.game_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own game stores"
ON public.game_stores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game stores"
ON public.game_stores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game stores"
ON public.game_stores FOR DELETE
USING (auth.uid() = user_id);
