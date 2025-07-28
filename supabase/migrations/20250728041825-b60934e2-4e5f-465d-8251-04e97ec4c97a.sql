-- Add new foreign key columns
ALTER TABLE public.games 
ADD COLUMN platform_id UUID REFERENCES public.platforms(id),
ADD COLUMN playthrough_platform_id UUID REFERENCES public.platforms(id);

-- Migrate existing data by matching platform names
UPDATE public.games 
SET platform_id = p.id 
FROM public.platforms p 
WHERE public.games.platform = p.name AND p.type = 'platform';

UPDATE public.games 
SET playthrough_platform_id = p.id 
FROM public.platforms p 
WHERE public.games.playthrough_platform = p.name AND p.type = 'storefront';

-- Drop old text columns
ALTER TABLE public.games 
DROP COLUMN platform,
DROP COLUMN playthrough_platform;

-- Rename new columns to original names
ALTER TABLE public.games 
RENAME COLUMN platform_id TO platform;

ALTER TABLE public.games 
RENAME COLUMN playthrough_platform_id TO playthrough_platform;