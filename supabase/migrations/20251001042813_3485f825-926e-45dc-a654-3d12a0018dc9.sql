-- Add skipped field to games table
ALTER TABLE public.games 
ADD COLUMN skipped date;