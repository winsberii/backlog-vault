import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Clock, Gamepad2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  gameId: string;
}

interface Playthrough {
  id: string;
  completion_date: string | null;
  playtime: number | null;
  platform: string | null;
  notes: string | null;
  created_at: string;
  platforms?: { name: string } | null;
}

export const GamePlaythroughs = ({ gameId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("playthroughs")
        .select("id, completion_date, playtime, platform, notes, created_at, platforms:platform(name)")
        .eq("game_id", gameId)
        .order("completion_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setPlaythroughs(data as any);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (playthroughs.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No playthroughs recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {playthroughs.map((p, idx) => {
        const dateLabel = p.completion_date
          ? format(parseISO(p.completion_date), "MMM d, yyyy")
          : "No date";
        return (
          <Card key={p.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-muted-foreground text-xs">#{playthroughs.length - idx}</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {dateLabel}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {p.platforms?.name && (
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="h-4 w-4" />
                      {p.platforms.name}
                    </span>
                  )}
                  {p.playtime != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {p.playtime}h
                    </span>
                  )}
                </div>
              </div>
              {p.notes && (
                <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{p.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
