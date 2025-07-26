import { useState } from "react";
import { ViewMode } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Edit, 
  Play, 
  CheckCircle, 
  Clock, 
  Calendar, 
  DollarSign,
  Copy,
  Trash2 
} from "lucide-react";
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

      {/* Games List */}
      <div className="space-y-2">
        {filteredGames.map((game) => (
          <GameListItem
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

interface GameListItemProps {
  game: {
    id: number;
    title: string;
    platform: string;
    playthroughPlatform: string;
    coverImage: string;
    isCurrentlyPlaying: boolean;
    isCompleted: boolean;
    needsPurchase: boolean;
    estimatedDuration: number;
    actualPlaytime: number;
    completionDate: string | null;
    price: number | null;
    comment: string;
    tags: string[];
  };
  viewMode: ViewMode;
  onEdit: () => void;
}

const GameListItem = ({ game, viewMode, onEdit }: GameListItemProps) => {
  const handleClone = () => {
    console.log("Clone game:", game.id);
  };

  const handleDelete = () => {
    console.log("Delete game:", game.id);
  };

  const handleToggleCurrentlyPlaying = () => {
    console.log("Toggle currently playing:", game.id);
  };

  const handleMarkCompleted = () => {
    console.log("Mark completed:", game.id);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-secondary/20 transition-colors group">
      {/* Cover Image */}
      <div className="flex-shrink-0">
        <img 
          src={game.coverImage} 
          alt={game.title}
          className="w-16 h-20 object-cover rounded border"
        />
      </div>

      {/* Game Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg truncate">{game.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Platform: <span className="text-foreground">{game.platform}</span></span>
              
              {viewMode === 'backlog' && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {game.estimatedDuration}h
                  </span>
                  {game.actualPlaytime > 0 && (
                    <span>Played: {game.actualPlaytime}h</span>
                  )}
                </>
              )}
              
              {viewMode === 'wishlist' && game.price && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${game.price}
                </span>
              )}
              
              {viewMode === 'completed' && game.completionDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(game.completionDate).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {game.comment && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {game.comment}
              </p>
            )}
            
            {game.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {game.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {game.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{game.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-col gap-1">
            {game.isCurrentlyPlaying && (
              <Badge className="bg-accent text-accent-foreground">
                <Play className="h-3 w-3 mr-1" />
                Playing
              </Badge>
            )}
            {game.isCompleted && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="border-border hover:bg-secondary/50"
        >
          <Edit className="h-3 w-3" />
        </Button>
        
        {viewMode === 'backlog' && !game.isCurrentlyPlaying && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleCurrentlyPlaying}
            className="border-border hover:bg-secondary/50"
            title="Mark as currently playing"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
        
        {viewMode === 'backlog' && !game.isCompleted && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkCompleted}
            className="border-border hover:bg-secondary/50"
            title="Mark as completed"
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleClone}
          className="border-border hover:bg-secondary/50"
          title="Clone game"
        >
          <Copy className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          className="border-border hover:bg-destructive hover:text-destructive-foreground"
          title="Delete game"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};