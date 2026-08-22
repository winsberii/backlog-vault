-- Genres dictionary (shared tag list, insertable by authenticated users)
CREATE TABLE public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.genres TO anon;
GRANT SELECT, INSERT ON public.genres TO authenticated;
GRANT ALL ON public.genres TO service_role;

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Genres are publicly readable"
  ON public.genres FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create genres"
  ON public.genres FOR INSERT TO authenticated WITH CHECK (true);

-- Junction: which genres (tags) a user assigned to a game
CREATE TABLE public.game_genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, genre_id)
);

GRANT SELECT, INSERT, DELETE ON public.game_genres TO authenticated;
GRANT ALL ON public.game_genres TO service_role;

ALTER TABLE public.game_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own game genres"
  ON public.game_genres FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own game genres"
  ON public.game_genres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own game genres"
  ON public.game_genres FOR DELETE TO authenticated USING (auth.uid() = user_id);