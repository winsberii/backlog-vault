-- Add achievements column to games table
ALTER TABLE public.games 
ADD COLUMN achievements INTEGER DEFAULT 0;