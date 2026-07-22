
CREATE TABLE public.playthroughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  completion_date date,
  playtime numeric,
  platform uuid REFERENCES public.platforms(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playthroughs TO authenticated;
GRANT ALL ON public.playthroughs TO service_role;

ALTER TABLE public.playthroughs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playthroughs" ON public.playthroughs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playthroughs" ON public.playthroughs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playthroughs" ON public.playthroughs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own playthroughs" ON public.playthroughs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX playthroughs_user_id_idx ON public.playthroughs(user_id);
CREATE INDEX playthroughs_game_id_idx ON public.playthroughs(game_id);
CREATE INDEX playthroughs_completion_date_idx ON public.playthroughs(completion_date DESC);

CREATE TRIGGER update_playthroughs_updated_at
  BEFORE UPDATE ON public.playthroughs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: create one playthrough per existing completed game
INSERT INTO public.playthroughs (user_id, game_id, completion_date, playtime, platform)
SELECT user_id, id, completion_date, actual_playtime, playthrough_platform
FROM public.games
WHERE is_completed = true;
