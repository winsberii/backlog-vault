import { useState, useEffect } from "react";
import { ViewMode } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  Square,
  Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface GameLibraryProps {
  viewMode: ViewMode;
  onEditGame: (game: any) => void;
  refreshTrigger?: number;
  onStatsChange?: (stats: { count: number; totalDuration: number }) => void;
}

export const GameLibrary = ({ viewMode, onEditGame, refreshTrigger, onStatsChange }: GameLibraryProps) => {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("title");

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

  // Get unique platforms for filter
  const uniquePlatforms = Array.from(new Set(games.map(game => game.platform_info?.name).filter(Boolean)));

  // Filter games based on view mode and filters
  const filteredGames = games.filter((game) => {
    // View mode filter
    let passesViewMode = false;
    switch (viewMode) {
      case 'backlog':
        passesViewMode = !game.is_completed && !game.tosort;
        break;
      case 'wishlist':
        passesViewMode = game.needs_purchase && !game.tosort;
        break;
      case 'completed':
        passesViewMode = game.is_completed && !game.tosort;
        break;
      case 'tosort':
        passesViewMode = game.tosort;
        break;
      default:
        passesViewMode = true;
    }

    // Search filter
    const passesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());

    // Platform filter
    const passesPlatform = selectedPlatforms.length === 0 || 
      selectedPlatforms.includes(game.platform_info?.name);

    // Status filter
    let passesStatus = selectedStatuses.length === 0;
    if (selectedStatuses.length > 0) {
      if (selectedStatuses.includes('playing') && game.is_currently_playing) passesStatus = true;
      if (selectedStatuses.includes('completed') && game.is_completed) passesStatus = true;
      if (selectedStatuses.includes('wishlist') && game.needs_purchase) passesStatus = true;
    }

    return passesViewMode && passesSearch && passesPlatform && passesStatus;
  }).sort((a, b) => {
    // View-specific sorting takes precedence over manual filter sorting
    if (viewMode === 'backlog') {
      // Primary sort: Currently Playing (descending) - playing games first
      if (a.is_currently_playing !== b.is_currently_playing) {
        return b.is_currently_playing ? 1 : -1;
      }
      // Secondary sort: Title (ascending) - alphabetical
      return a.title.localeCompare(b.title);
    }
    
    if (viewMode === 'completed') {
      // Primary sort: Completion Date (descending) - most recent first
      if (a.completion_date && b.completion_date) {
        const dateA = new Date(a.completion_date).getTime();
        const dateB = new Date(b.completion_date).getTime();
        if (dateA !== dateB) {
          return dateB - dateA;
        }
      } else if (a.completion_date && !b.completion_date) {
        return -1;
      } else if (!a.completion_date && b.completion_date) {
        return 1;
      }
      // Secondary sort: Title (ascending) - alphabetical
      return a.title.localeCompare(b.title);
    }
    
    // For other views (wishlist, tosort), use manual sorting from filters
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'duration') {
      return (b.estimated_duration || 0) - (a.estimated_duration || 0);
    }
    if (sortBy === 'created') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    // Default fallback sorting (by creation date)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Calculate statistics and notify parent
  useEffect(() => {
    const totalDuration = filteredGames.reduce((sum, game) => {
      return sum + (game.estimated_duration || 0);
    }, 0);

    onStatsChange?.({
      count: filteredGames.length,
      totalDuration
    });
  }, [filteredGames]);

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

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4 z-10 relative">
          <h3 className="font-medium text-sm">Filters & Sorting</h3>
          
          {/* Sort Options */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sort by</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="duration">Duration (High to Low)</SelectItem>
                <SelectItem value="created">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Platform Filter */}
          {uniquePlatforms.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Platforms</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uniquePlatforms.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform}`}
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                        }
                      }}
                    />
                    <label htmlFor={`platform-${platform}`} className="text-xs">{platform}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="space-y-1">
              {[
                { id: 'playing', label: 'Currently Playing' },
                { id: 'completed', label: 'Completed' },
                { id: 'wishlist', label: 'Wishlist' }
              ].map((status) => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={selectedStatuses.includes(status.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStatuses([...selectedStatuses, status.id]);
                      } else {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== status.id));
                      }
                    }}
                  />
                  <label htmlFor={`status-${status.id}`} className="text-xs">{status.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSelectedPlatforms([]);
              setSelectedStatuses([]);
              setSortBy("title");
            }}
            className="w-full"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Games List */}
      <div className="space-y-1">
        {filteredGames.map((game) => (
          <GameListItem
            key={game.id}
            game={game}
            viewMode={viewMode}
            onEdit={() => onEditGame(game)}
            onRefresh={fetchGames}
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
  onRefresh: () => Promise<void>;
}

const GameListItem = ({ game, viewMode, onEdit, onRefresh }: GameListItemProps) => {
  const { toast } = useToast();
  
  const handleClone = () => {
    console.log("Clone game:", game.id);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Game deleted",
        description: `${game.title} has been deleted from your library.`,
      });

      await onRefresh();
    } catch (error: any) {
      console.error("Error deleting game:", error);
      toast({
        title: "Error",
        description: "Failed to delete game. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleCurrentlyPlaying = async () => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ is_currently_playing: !game.is_currently_playing })
        .eq('id', game.id);

      if (error) {
        throw error;
      }

      toast({
        title: game.is_currently_playing ? "Stopped playing" : "Now playing",
        description: `${game.title} ${game.is_currently_playing ? 'removed from' : 'marked as'} currently playing.`,
      });

      await onRefresh();
    } catch (error: any) {
      console.error("Error updating game status:", error);
      toast({
        title: "Error",
        description: "Failed to update game status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const { error } = await supabase
        .from('games')
        .update({ 
          is_completed: true,
          is_currently_playing: false, // Can't be playing if completed
          completion_date: new Date().toISOString().split('T')[0] // Today's date
        })
        .eq('id', game.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Game completed!",
        description: `${game.title} has been marked as completed.`,
      });

      await onRefresh();
    } catch (error: any) {
      console.error("Error marking game as completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark game as completed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded hover:bg-secondary/20 transition-colors group">
      {/* Cover Image */}
      <div className="flex-shrink-0">
        <img 
          src={game.cover_image || "/placeholder.svg"} 
          alt={game.title}
          className="w-9 h-11 object-contain bg-muted rounded transition-transform duration-200 hover:scale-[4] hover:z-10 relative"
        />
      </div>

      {/* Game Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Title and platform on same line */}
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{game.title}</h3>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {game.platform_info?.name}
                {game.playthrough_platform_info?.name && game.playthrough_platform_info.name !== game.platform_info?.name && (
                  <> | {game.playthrough_platform_info.name}</>
                )}
              </span>
            </div>
            
            {/* Compact info line */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {viewMode === 'backlog' && (
                <>
                  {game.estimated_duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {game.estimated_duration}h
                    </span>
                  )}
                  {game.actual_playtime > 0 && (
                    <span>Played: {game.actual_playtime}h</span>
                  )}
                  {game.achievements > 0 && (
                    <span className="flex items-center gap-1">
                      <Trophy className="h-2.5 w-2.5" />
                      {game.achievements}
                    </span>
                  )}
                </>
              )}
              
              {viewMode === 'wishlist' && game.price && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-2.5 w-2.5" />
                  ${game.price}
                </span>
              )}
              
              {viewMode === 'completed' && game.completion_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(game.completion_date).toLocaleDateString()}
                </span>
              )}
              
              {viewMode !== 'backlog' && game.comment && (
                <span className="truncate max-w-56">{game.comment}</span>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-1">
            {game.is_currently_playing && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                <Play className="h-2.5 w-2.5 mr-1" />
                Playing
              </Badge>
            )}
            {game.is_completed && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-100 text-green-800">
                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                Done
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-6 w-6 p-0"
        >
          <Edit className="h-3 w-3" />
        </Button>
        
        {viewMode === 'backlog' && !game.is_currently_playing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleCurrentlyPlaying}
            className="h-6 w-6 p-0"
            title="Mark as currently playing"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
        
        {viewMode === 'backlog' && game.is_currently_playing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleCurrentlyPlaying}
            className="h-6 w-6 p-0"
            title="Stop playing"
          >
            <Square className="h-3 w-3" />
          </Button>
        )}
        
        {(viewMode === 'wishlist' || viewMode === 'completed') && game.is_currently_playing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleCurrentlyPlaying}
            className="h-6 w-6 p-0"
            title="Stop playing"
          >
            <Square className="h-3 w-3" />
          </Button>
        )}
        
        {viewMode === 'backlog' && !game.is_completed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Mark as completed"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Game as Completed</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to mark "{game.title}" as completed? This will move it to your completed games list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMarkCompleted}>
                  Mark Completed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClone}
          className="h-6 w-6 p-0"
          title="Clone game"
        >
          <Copy className="h-3 w-3" />
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              title="Delete game"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Game</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{game.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};