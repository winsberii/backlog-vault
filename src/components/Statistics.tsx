import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, SkipForward, Clock } from "lucide-react";

interface YearStats {
  year: string;
  completed: number;
  duration: number;
  skipped: number;
}

interface PlatformInfo {
  id: string;
  name: string;
  display_order: number;
}

interface PlatformStats {
  name: string;
  displayOrder: number;
  count: number;
  estimatedDuration: number;
}

export const Statistics = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setIsLoading(true);
      const [gamesRes, platformsRes] = await Promise.all([
        supabase
          .from("games")
          .select("is_completed, skipped, completion_date, actual_playtime, estimated_duration, created_at, platform, tosort")
          .eq("user_id", user.id),
        supabase
          .from("platforms")
          .select("id, name, display_order")
          .order("display_order", { ascending: true })
      ]);
      if (!gamesRes.error) setRows(gamesRes.data || []);
      if (!platformsRes.error) setPlatforms(platformsRes.data || []);
      setIsLoading(false);
    })();
  }, [user]);

  const { byYear, totals, byPlatform } = useMemo(() => {
    const map = new Map<string, YearStats>();
    const ensure = (y: string) => {
      if (!map.has(y)) map.set(y, { year: y, completed: 0, duration: 0, skipped: 0 });
      return map.get(y)!;
    };
    let tC = 0, tD = 0, tS = 0;

    const platformMap = new Map<string, PlatformStats>();

    for (const g of rows) {
      if (g.is_completed) {
        const date = g.completion_date || g.created_at;
        const y = date ? new Date(date).getFullYear().toString() : "Unknown";
        const s = ensure(y);
        s.completed += 1;
        const dur = Number(g.actual_playtime) || Number(g.estimated_duration) || 0;
        s.duration += dur;
        tC += 1;
        tD += dur;
      }
      if (g.skipped) {
        const y = g.created_at ? new Date(g.created_at).getFullYear().toString() : "Unknown";
        ensure(y).skipped += 1;
        tS += 1;
      }
      // Backlog: not completed, not to-sort, not skipped
      if (!g.is_completed && !g.tosort && !g.skipped) {
        const platform = platforms.find((p) => p.id === g.platform);
        const name = platform?.name || "Unknown";
        const displayOrder = platform?.display_order ?? Number.MAX_SAFE_INTEGER;
        const existing = platformMap.get(name);
        if (existing) {
          existing.count += 1;
          existing.estimatedDuration += Number(g.estimated_duration) || 0;
        } else {
          platformMap.set(name, {
            name,
            displayOrder,
            count: 1,
            estimatedDuration: Number(g.estimated_duration) || 0,
          });
        }
      }
    }
    const byYear = Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
    const byPlatform = Array.from(platformMap.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    return { byYear, totals: { completed: tC, duration: tD, skipped: tS }, byPlatform };
  }, [rows, platforms]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Games Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.duration}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Games Skipped</CardTitle>
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.skipped}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Year</CardTitle>
        </CardHeader>
        <CardContent>
          {byYear.length === 0 ? (
            <div className="text-muted-foreground text-sm">No data yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Time Spent</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byYear.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell className="font-medium">{y.year}</TableCell>
                    <TableCell className="text-right">{y.completed}</TableCell>
                    <TableCell className="text-right">{y.duration}h</TableCell>
                    <TableCell className="text-right">{y.skipped}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backlog by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          {byPlatform.length === 0 ? (
            <div className="text-muted-foreground text-sm">No backlog data by platform.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">Est. Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPlatform.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.count}</TableCell>
                    <TableCell className="text-right">{p.estimatedDuration}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
