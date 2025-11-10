-- Add number_of_players column to games table
ALTER TABLE public.games 
ADD COLUMN number_of_players text;

COMMENT ON COLUMN public.games.number_of_players IS 'Number of players supported (e.g., "1", "1-4", "2-8")';