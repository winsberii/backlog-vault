-- Create platforms table
CREATE TABLE public.platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('platform', 'storefront')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read platforms (public data)
CREATE POLICY "Platforms are publicly readable" 
ON public.platforms 
FOR SELECT 
USING (true);

-- Insert default platforms
INSERT INTO public.platforms (name, type) VALUES
  ('PC', 'platform'),
  ('PlayStation 5', 'platform'),
  ('PlayStation 4', 'platform'),
  ('Xbox Series X/S', 'platform'),
  ('Xbox One', 'platform'),
  ('Nintendo Switch', 'platform'),
  ('Steam Deck', 'platform'),
  ('Mobile', 'platform');

-- Insert default storefronts/playthrough platforms
INSERT INTO public.platforms (name, type) VALUES
  ('Steam', 'storefront'),
  ('Epic Games', 'storefront'),
  ('GOG', 'storefront'),
  ('PlayStation Store', 'storefront'),
  ('Xbox Game Pass', 'storefront'),
  ('Nintendo eShop', 'storefront'),
  ('Origin', 'storefront'),
  ('Ubisoft Connect', 'storefront'),
  ('Battle.net', 'storefront'),
  ('itch.io', 'storefront');