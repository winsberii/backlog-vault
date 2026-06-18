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

export const Statistics = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("games")
        .select("is_completed, skipped, completion_date, actual_playtime, estimated_duration, created_at")
        .eq("user_id", user.id);
      if (!error) setRows(data || []);
      setIsLoading(false);
    })();
  }, [user]);

  const { byYear, totals } = useMemo(() => {
    const map = new Map<string, YearStats>();
    const ensure = (y: string) => {
      if (!map.has(y)) map.set(y, { year: y, completed: 0, duration: 0, skipped: 0 });
      return map.get(y)!;
    };
    let tC = 0, tD = 0, tS = 0;
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
    }
    const byYear = Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
    return { byYear, totals: { completed: tC, duration: tD, skipped: tS } };
  }, [rows]);

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
    </div>
  );
};
