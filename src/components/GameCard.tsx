import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ViewMode } from "@/pages/Index";
import { 
  Play, 
  Edit, 
  Copy, 
  Trash2, 
  Clock, 
  Calendar,
  DollarSign,
  CheckCircle 
} from "lucide-react";

interface GameCardProps {
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
  onDelete: (gameId: number) => void;
}

export const GameCard = ({ game, viewMode, onEdit, onDelete }: GameCardProps) => {
  const handleClone = () => {
    // TODO: Implement clone functionality
    console.log("Clone game:", game.id);
  };

  const handleDelete = () => {
    onDelete(game.id);
  };

  const handleToggleCurrentlyPlaying = () => {
    // TODO: Implement toggle currently playing
    console.log("Toggle currently playing:", game.id);
  };

  const handleMarkCompleted = () => {
    // TODO: Implement mark as completed
    console.log("Mark completed:", game.id);
  };

  return (
    <Card className="bg-gradient-card border-border hover:shadow-hover transition-smooth group overflow-hidden">
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={game.coverImage} 
          alt={game.title}
          className="w-full h-full object-contain bg-muted transition-transform duration-300 group-hover:scale-105"
        />
        {game.isCurrentlyPlaying && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
            <Play className="h-3 w-3 mr-1" />
            Playing
          </Badge>
        )}
        {game.isCompleted && (
          <Badge className="absolute top-2 right-2 bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Done
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{game.title}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Platform:</span>
            <span className="text-foreground">{game.platform}</span>
          </div>
          
          {viewMode === 'backlog' && (
            <>
              <div className="flex justify-between">
                <span>Duration:</span>
                <div className="flex items-center text-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {game.estimatedDuration}h
                </div>
              </div>
              {game.actualPlaytime > 0 && (
                <div className="flex justify-between">
                  <span>Played:</span>
                  <span className="text-foreground">{game.actualPlaytime}h</span>
                </div>
              )}
            </>
          )}
          
          {viewMode === 'wishlist' && game.price && (
            <div className="flex justify-between">
              <span>Price:</span>
              <div className="flex items-center text-foreground">
                <DollarSign className="h-3 w-3 mr-1" />
                ${game.price}
              </div>
            </div>
          )}
          
          {viewMode === 'completed' && game.completionDate && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <div className="flex items-center text-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(game.completionDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {game.comment && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {game.comment}
          </p>
        )}

        {game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {game.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {game.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{game.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="flex-1 border-border hover:bg-secondary/50"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        
        {viewMode === 'backlog' && !game.isCurrentlyPlaying && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleCurrentlyPlaying}
            className="border-border hover:bg-secondary/50"
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
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
      </CardFooter>
    </Card>
  );
};