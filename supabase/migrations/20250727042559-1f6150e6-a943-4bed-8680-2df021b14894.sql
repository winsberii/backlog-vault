-- Create games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform TEXT,
  playthrough_platform TEXT,
  cover_image TEXT,
  is_currently_playing BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  needs_purchase BOOLEAN DEFAULT false,
  estimated_duration INTEGER,
  actual_playtime INTEGER,
  completion_date DATE,
  price DECIMAL(10,2),
  comment TEXT,
  retro_achievement_url TEXT,
  how_long_to_beat_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own games" 
ON public.games 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own games" 
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games" 
ON public.games 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own games" 
ON public.games 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();