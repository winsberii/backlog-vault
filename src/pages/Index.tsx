import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GameLibrary } from "@/components/GameLibrary";
import { GameForm } from "@/components/GameForm";
import { ImportExport } from "@/components/ImportExport";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Gamepad, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
export type ViewMode = 'backlog' | 'wishlist' | 'completed' | 'tosort' | 'skipped';
const Index = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('backlog');
  const [showGameForm, setShowGameForm] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [listStats, setListStats] = useState({ count: 0, totalDuration: 0 });
  const isMobile = useIsMobile();
  const {
    user,
    loading,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  const handleAddGame = () => {
    setEditingGame(null);
    setShowGameForm(true);
  };
  const handleEditGame = (game: any) => {
    setEditingGame(game);
    setShowGameForm(true);
  };
  const handleCloseForm = () => {
    setShowGameForm(false);
    setEditingGame(null);
  };

  const handleGameSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>;
  }
  if (!user) {
    return null; // Will redirect to auth
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className={`mb-6 flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-start'}`}>
          {!isMobile && <div></div>}
          <div className={`flex items-center ${isMobile ? 'justify-between' : 'gap-4'}`}>
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <Navigation currentView={currentView} onViewChange={setCurrentView} />

        {/* Header and Actions */}
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-center'} mb-6`}>
          <div>
            <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold capitalize`}>
              {currentView === 'backlog' ? 'My Backlog' : currentView === 'wishlist' ? 'Wishlist' : currentView === 'tosort' ? 'To Sort' : currentView === 'skipped' ? 'Skipped Games' : 'Completed Games'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Gamepad className="h-4 w-4" />
                {listStats.count}
              </span>
              {listStats.totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {listStats.totalDuration}h
                </span>
              )}
            </div>
          </div>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'gap-2'}`}>
            <Button
              onClick={() => setShowImportExport(true)}
              variant="outline"
              className={`gap-2 ${isMobile ? 'w-full justify-center h-11' : ''}`}
              size={isMobile ? "default" : "default"}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import/Export
            </Button>
            <Button 
              onClick={handleAddGame} 
              className={`bg-primary hover:bg-primary/90 shadow-lg hover:shadow-hover transition-all duration-300 ${isMobile ? 'w-full justify-center h-11' : ''}`}
              size={isMobile ? "default" : "default"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          </div>
        </div>

        {/* Game Library */}
        <GameLibrary 
          viewMode={currentView} 
          onEditGame={handleEditGame} 
          refreshTrigger={refreshTrigger}
          onStatsChange={setListStats}
        />

        {/* Game Form Modal */}
        {showGameForm && <GameForm game={editingGame} onClose={handleCloseForm} onSave={handleGameSaved} />}
        
        {/* Import/Export Modal */}
        {showImportExport && (
          <ImportExport
            isOpen={showImportExport}
            onClose={() => setShowImportExport(false)}
            onImportComplete={handleImportComplete}
          />
        )}
      </div>
    </div>;
};
export default Index;