import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const PDFExport = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
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

      // Create PDF
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('Game Library Report', 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      pdf.text(`Total Games: ${games.length}`, 20, 35);

      // Calculate statistics
      const completedGames = games.filter(g => g.is_completed).length;
      const currentlyPlaying = games.filter(g => g.is_currently_playing).length;
      const needsPurchase = games.filter(g => g.needs_purchase).length;
      const totalPlaytime = games.reduce((sum, g) => sum + (g.actual_playtime || 0), 0);

      // Add statistics
      pdf.text(`Completed Games: ${completedGames}`, 20, 40);
      pdf.text(`Currently Playing: ${currentlyPlaying}`, 20, 45);
      pdf.text(`Needs Purchase: ${needsPurchase}`, 20, 50);
      pdf.text(`Total Playtime: ${totalPlaytime} hours`, 20, 55);

      // Prepare table data
      const tableData = games.map(game => [
        game.title || '',
        game.platform?.name || '',
        game.playthrough_platform?.name || '',
        game.is_completed ? 'Yes' : 'No',
        game.is_currently_playing ? 'Yes' : 'No',
        game.actual_playtime ? `${game.actual_playtime}h` : '',
        game.completion_date || '',
        game.price ? `$${game.price}` : ''
      ]);

      // Add table
      autoTable(pdf, {
        head: [['Title', 'Platform', 'Playthrough', 'Completed', 'Playing', 'Playtime', 'Completed Date', 'Price']],
        body: tableData,
        startY: 65,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: 255,
        },
        columnStyles: {
          0: { cellWidth: 40 }, // Title
          1: { cellWidth: 25 }, // Platform
          2: { cellWidth: 25 }, // Playthrough
          3: { cellWidth: 15 }, // Completed
          4: { cellWidth: 15 }, // Playing
          5: { cellWidth: 15 }, // Playtime
          6: { cellWidth: 25 }, // Date
          7: { cellWidth: 15 }, // Price
        },
        margin: { left: 10, right: 10 },
      });

      // Add detailed section if there are comments
      const gamesWithComments = games.filter(g => g.comment);
      if (gamesWithComments.length > 0) {
        const finalY = (pdf as any).lastAutoTable.finalY || 65;
        
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Game Comments', 20, 20);
        
        let yPosition = 35;
        gamesWithComments.forEach((game, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(game.title || '', 20, yPosition);
          
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(10);
          
          // Split long comments into multiple lines
          const commentLines = pdf.splitTextToSize(game.comment || '', 170);
          pdf.text(commentLines, 20, yPosition + 5);
          
          yPosition += 5 + (commentLines.length * 5) + 5;
        });
      }

      // Save the PDF
      pdf.save(`game_library_report_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${games.length} games to PDF.`,
      });

    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export games to PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToPDF}
      disabled={isExporting}
      className="w-full"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Generating..." : "Export to PDF"}
    </Button>
  );
};