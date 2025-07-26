import { useState } from "react";
import { GameLibrary } from "@/components/GameLibrary";
import { GameForm } from "@/components/GameForm";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export type ViewMode = 'backlog' | 'wishlist' | 'completed';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('backlog');
  const [showGameForm, setShowGameForm] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Game Backlog Manager
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your gaming journey from wishlist to completion
          </p>
        </div>

        {/* Navigation */}
        <Navigation currentView={currentView} onViewChange={setCurrentView} />

        {/* Add Game Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold capitalize">
            {currentView === 'backlog' ? 'My Backlog' : 
             currentView === 'wishlist' ? 'Wishlist' : 'Completed Games'}
          </h2>
          <Button 
            onClick={handleAddGame}
            className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-hover transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Game
          </Button>
        </div>

        {/* Game Library */}
        <GameLibrary 
          viewMode={currentView} 
          onEditGame={handleEditGame}
        />

        {/* Game Form Modal */}
        {showGameForm && (
          <GameForm 
            game={editingGame}
            onClose={handleCloseForm}
          />
        )}
      </div>
    </div>
  );
};

export default Index;