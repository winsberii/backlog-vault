-- Add tosort boolean field to games table
ALTER TABLE public.games 
ADD COLUMN tosort boolean DEFAULT false;