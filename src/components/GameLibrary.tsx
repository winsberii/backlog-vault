import { useState } from "react";
import { ViewMode } from "@/pages/Index";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import witcher3Cover from "@/assets/witcher3-cover.jpg";
import cyberpunkCover from "@/assets/cyberpunk-cover.jpg";
import godofwarCover from "@/assets/godofwar-cover.jpg";

// Mock data for demonstration
const mockGames = [
  {
    id: 1,
    title: "The Witcher 3: Wild Hunt",
    platform: "PC",
    playthroughPlatform: "Steam",
    coverImage: witcher3Cover,
    isCurrentlyPlaying: true,
    isCompleted: false,
    needsPurchase: false,
    estimatedDuration: 50,
    actualPlaytime: 25,
    completionDate: null,
    price: null,
    comment: "Amazing RPG with incredible story and side quests",
    tags: ["RPG", "Open World"],
  },
  {
    id: 2,
    title: "Cyberpunk 2077",
    platform: "PC",
    playthroughPlatform: "GOG",
    coverImage: cyberpunkCover,
    isCurrentlyPlaying: false,
    isCompleted: false,
    needsPurchase: true,
    estimatedDuration: 60,
    actualPlaytime: 0,
    completionDate: null,
    price: 39.99,
    comment: "Waiting for more patches and DLC",
    tags: ["RPG", "Cyberpunk"],
  },
  {
    id: 3,
    title: "God of War",
    platform: "PlayStation 5",
    playthroughPlatform: "PlayStation 5",
    coverImage: godofwarCover,
    isCurrentlyPlaying: false,
    isCompleted: true,
    needsPurchase: false,
    estimatedDuration: 25,
    actualPlaytime: 28,
    completionDate: "2024-01-15",
    price: null,
    comment: "Absolutely phenomenal. Perfect story and gameplay.",
    tags: ["Action", "Adventure"],
  },
];

interface GameLibraryProps {
  viewMode: ViewMode;
  onEditGame: (game: any) => void;
}

export const GameLibrary = ({ viewMode, onEditGame }: GameLibraryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter games based on view mode
  const filteredGames = mockGames.filter((game) => {
    switch (viewMode) {
      case 'backlog':
        return !game.isCompleted;
      case 'wishlist':
        return game.needsPurchase;
      case 'completed':
        return game.isCompleted;
      default:
        return true;
    }
  }).filter((game) => 
    game.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-border hover:bg-secondary/50"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            viewMode={viewMode}
            onEdit={() => onEditGame(game)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">
            No games found
          </div>
          <div className="text-muted-foreground">
            {searchTerm 
              ? "Try adjusting your search terms" 
              : `No games in your ${viewMode} yet`
            }
          </div>
        </div>
      )}
    </div>
  );
};