import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GameLibraryProps {
  viewMode: ViewMode;
  onEditGame: (game: any) => void;
  refreshTrigger?: number;
}

export const GameLibrary = ({ viewMode, onEditGame, refreshTrigger }: GameLibraryProps) => {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchGames = async () => {
    if (!user) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          platform_info:platform(name),
          playthrough_platform_info:playthrough_platform(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [user, refreshTrigger]);

  // Filter games based on view mode
  const filteredGames = games.filter((game) => {
    switch (viewMode) {
      case 'backlog':
        return !game.is_completed && !game.is_currently_playing && !game.needs_purchase;
      case 'wishlist':
        return game.needs_purchase;
      case 'completed':
        return game.is_completed;
      default:
        return true;
    }
  }).filter((game) => 
    game.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-muted-foreground">Loading games...</div>
      </div>
    );
  }

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
  game: any;
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
          src={game.cover_image || "/placeholder.svg"} 
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
              <span>Platform: <span className="text-foreground">{game.platform_info?.name || 'Unknown'}</span></span>
              
              {viewMode === 'backlog' && (
                <>
                  {game.estimated_duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {game.estimated_duration}h
                    </span>
                  )}
                  {game.actual_playtime > 0 && (
                    <span>Played: {game.actual_playtime}h</span>
                  )}
                </>
              )}
              
              {viewMode === 'wishlist' && game.price && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  ${game.price}
                </span>
              )}
              
              {viewMode === 'completed' && game.completion_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(game.completion_date).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {game.comment && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {game.comment}
              </p>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-col gap-1">
            {game.is_currently_playing && (
              <Badge className="bg-accent text-accent-foreground">
                <Play className="h-3 w-3 mr-1" />
                Playing
              </Badge>
            )}
            {game.is_completed && (
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
        
        {viewMode === 'backlog' && !game.is_currently_playing && (
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
        
        {viewMode === 'backlog' && !game.is_completed && (
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