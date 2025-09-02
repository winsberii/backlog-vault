
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const CSVExport = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to export data.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Fetch all games with platform names
      const { data: games, error } = await supabase
        .from('games')
        .select(`
          *,
          platform:platforms!platform(name),
          playthrough_platform:platforms!playthrough_platform(name)
        `)
        .eq('user_id', user.id)
        .order('title');

      if (error) throw error;

      if (!games || games.length === 0) {
        toast({
          title: "No Data",
          description: "No games found to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare CSV headers
      const headers = [
        "Title",
        "Platform",
        "Playthrough Platform",
        "Currently Playing",
        "Completed",
        "Needs Purchase",
        "To Sort",
        "Estimated Duration (hours)",
        "Actual Playtime (hours)",
        "Completion Date",
        "Price",
        "Achievements",
        "Comment",
        "RetroAchievements URL",
        "HowLongToBeat URL",
        "Created At",
        "Updated At"
      ];

      // Convert games to CSV format
      const csvRows = games.map(game => [
        `"${(game.title || '').replace(/"/g, '""')}"`,
        `"${(game.platform?.name || '').replace(/"/g, '""')}"`,
        `"${(game.playthrough_platform?.name || '').replace(/"/g, '""')}"`,
        game.is_currently_playing ? 'true' : 'false',
        game.is_completed ? 'true' : 'false',
        game.needs_purchase ? 'true' : 'false',
        game.tosort ? 'true' : 'false',
        game.estimated_duration || '',
        game.actual_playtime || '',
        game.completion_date || '',
        game.price || '',
        game.achievements || '',
        `"${(game.comment || '').replace(/"/g, '""')}"`,
        `"${(game.retro_achievement_url || '').replace(/"/g, '""')}"`,
        `"${(game.how_long_to_beat_url || '').replace(/"/g, '""')}"`,
        game.created_at ? new Date(game.created_at).toLocaleDateString() : '',
        game.updated_at ? new Date(game.updated_at).toLocaleDateString() : ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `games_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${games.length} games to CSV.`,
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export games.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      disabled={isExporting}
      className="w-full"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Exporting..." : "Export to CSV"}
    </Button>
  );
};
