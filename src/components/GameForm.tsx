import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Calendar, Loader2, Download, Search } from "lucide-react";
import { uploadCoverImage, deleteCoverImage } from "@/lib/imageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface GameFormProps {
  game?: any;
  onClose: () => void;
  onSave?: () => void;
}

export const GameForm = ({ game, onClose, onSave }: GameFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingHLTB, setIsFetchingHLTB] = useState(false);
  const [isSearchingHLTB, setIsSearchingHLTB] = useState(false);
  const [isFetchingRA, setIsFetchingRA] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: game?.title || "",
    platform: game?.platform || "",
    playthroughPlatform: game?.playthrough_platform || "",
    coverImage: game?.cover_image || "",
    isCurrentlyPlaying: game?.is_currently_playing || false,
    isCompleted: game?.is_completed || false,
    needsPurchase: game?.needs_purchase || false,
    estimatedDuration: game?.estimated_duration || "",
    actualPlaytime: game?.actual_playtime || "",
    completionDate: game?.completion_date || "",
    price: game?.price || "",
    comment: game?.comment || "",
    achievements: game?.achievements || "",
    retroAchievementUrl: game?.retro_achievement_url || "",
    howLongToBeatUrl: game?.how_long_to_beat_url || "",
    tosort: game?.tosort || false,
  });

  // Fetch platforms on component mount
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        // Fetch all platforms for main platform selection
        const { data: allPlatforms } = await supabase
          .from('platforms')
          .select('*')
          .order('name');
        
        // Fetch only active platforms for playthrough platform selection
        const { data: activePlatformsData } = await supabase
          .from('platforms')
          .select('*')
          .eq('active', true)
          .order('name');

        setPlatforms(allPlatforms || []);
        setActivePlatforms(activePlatformsData || []);
      } catch (error) {
        console.error('Error fetching platforms:', error);
      }
    };

    fetchPlatforms();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save games.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const gameData = {
        user_id: user.id,
        title: formData.title,
        platform: formData.platform || null,
        playthrough_platform: formData.playthroughPlatform || null,
        cover_image: formData.coverImage || null,
        is_currently_playing: formData.isCurrentlyPlaying,
        is_completed: formData.isCompleted,
        needs_purchase: formData.needsPurchase,
        estimated_duration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : null,
        actual_playtime: formData.actualPlaytime ? parseInt(formData.actualPlaytime) : null,
        completion_date: formData.completionDate || null,
        price: formData.price ? parseFloat(formData.price) : null,
        comment: formData.comment || null,
        achievements: formData.achievements ? parseInt(formData.achievements) : null,
        retro_achievement_url: formData.retroAchievementUrl || null,
        how_long_to_beat_url: formData.howLongToBeatUrl || null,
        tosort: formData.tosort,
      };

      let error;
      
      if (game?.id) {
        // Update existing game
        const { error: updateError } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', game.id);
        error = updateError;
      } else {
        // Insert new game
        const { error: insertError } = await supabase
          .from('games')
          .insert([gameData]);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast({
        title: game ? "Game updated" : "Game added",
        description: `${formData.title} has been ${game ? "updated" : "added"} successfully.`,
      });
      
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving game:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload images.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadCoverImage(file);
      
      if (result.success && result.url) {
        handleInputChange("coverImage", result.url);
        toast({
          title: "Success",
          description: "Cover image uploaded successfully!",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload image. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (formData.coverImage) {
      // Try to delete from storage if it's a Supabase URL
      if (formData.coverImage.includes('supabase')) {
        await deleteCoverImage(formData.coverImage);
      }
      handleInputChange("coverImage", "");
      toast({
        title: "Image removed",
        description: "Cover image has been removed.",
      });
    }
  };

  const handleFetchHLTBData = async () => {
    if (!formData.howLongToBeatUrl) {
      toast({
        title: "Error",
        description: "Please enter a HowLongToBeat URL first.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to fetch data.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingHLTB(true);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-hltb-data', {
        body: { 
          url: formData.howLongToBeatUrl,
          userId: user.id,
          gameTitle: formData.title || "Unknown Game"
        }
      });

      if (error) throw error;

      if (data.success) {
        const { coverImage, estimatedDuration } = data.data;
        
        if (coverImage) {
          handleInputChange("coverImage", coverImage);
        }
        
        if (estimatedDuration > 0) {
          handleInputChange("estimatedDuration", estimatedDuration.toString());
        }

        toast({
          title: "Success",
          description: `Fetched data from HowLongToBeat${coverImage ? ' (cover image)' : ''}${estimatedDuration > 0 ? ` (${estimatedDuration}h duration)` : ''}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch data from HowLongToBeat",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching HLTB data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from HowLongToBeat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingHLTB(false);
    }
  };

  const handleSearchHLTB = async () => {
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Please enter a game title first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingHLTB(true);
    setSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-hltb', {
        body: { gameTitle: formData.title }
      });

      if (error) throw error;

      if (data.success && data.games.length > 0) {
        setSearchResults(data.games);
        setShowSearchDialog(true);
      } else {
        toast({
          title: "No results found",
          description: "No games found on HowLongToBeat. Try a different search term.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error searching HLTB:", error);
      toast({
        title: "Error",
        description: "Failed to search HowLongToBeat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingHLTB(false);
    }
  };

  const handleSelectSearchResult = (selectedGame: any) => {
    handleInputChange("howLongToBeatUrl", selectedGame.url);
    setShowSearchDialog(false);
    toast({
      title: "URL Selected",
      description: `HowLongToBeat URL set for "${selectedGame.title}"`,
    });
  };

  const handleFetchRAData = async () => {
    if (!formData.retroAchievementUrl) {
      toast({
        title: "Error",
        description: "Please enter a RetroAchievements URL first.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error", 
        description: "You must be logged in to fetch data.",
        variant: "destructive",
      });
      return;
    }

    if (!game?.id) {
      toast({
        title: "Error",
        description: "Please save the game first before fetching achievements.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingRA(true);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-retroachievements', {
        body: { 
          gameId: game.id,
          retroAchievementUrl: formData.retroAchievementUrl
        }
      });

      if (error) throw error;

      if (data.success) {
        const { achievementCount } = data;
        handleInputChange("achievements", achievementCount.toString());
        
        toast({
          title: "Success",
          description: `Found ${achievementCount} achievements from RetroAchievements`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch data from RetroAchievements",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching RA data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from RetroAchievements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingRA(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] m-2' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto bg-card border-border`}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-lg" : "text-2xl"}>
            {game ? "Edit Game" : "Add New Game"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-4'}`}>
              <TabsTrigger value="basic" className={isMobile ? "text-xs px-2" : ""}>
                {isMobile ? "Basic" : "Basic Info"}
              </TabsTrigger>
              <TabsTrigger value="status" className={isMobile ? "text-xs px-2" : ""}>Status</TabsTrigger>
              {!isMobile && <TabsTrigger value="details">Details</TabsTrigger>}
              {!isMobile && <TabsTrigger value="integration">Integration</TabsTrigger>}
            </TabsList>
            
            {isMobile && (
              <TabsList className="grid w-full grid-cols-2 gap-1 mt-2">
                <TabsTrigger value="details" className="text-xs px-2">Details</TabsTrigger>
                <TabsTrigger value="integration" className="text-xs px-2">Integration</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Game title"
                        required
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="platform">Platform</Label>
                      <Select value={formData.platform} onValueChange={(value) => handleInputChange("platform", value)}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              {platform.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="playthroughPlatform">Playthrough Platform</Label>
                      <Select value={formData.playthroughPlatform} onValueChange={(value) => handleInputChange("playthroughPlatform", value)}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select playthrough platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {activePlatforms.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              {platform.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coverImage">Cover Image</Label>
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileUpload}
                          className="bg-background border-border"
                          disabled={isUploading}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {isUploading && (
                        <p className="text-sm text-muted-foreground">Uploading image...</p>
                      )}
                    </div>
                  </div>

                  {formData.coverImage && (
                    <div className="mt-4 space-y-2">
                      <div className="relative inline-block">
                        <img 
                          src={formData.coverImage} 
                          alt="Cover preview" 
                          className="w-32 h-48 object-contain rounded border bg-muted"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Game Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="currentlyPlaying">Currently Playing</Label>
                      <Switch
                        id="currentlyPlaying"
                        checked={formData.isCurrentlyPlaying}
                        onCheckedChange={(checked) => handleInputChange("isCurrentlyPlaying", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="completed">Completed</Label>
                      <Switch
                        id="completed"
                        checked={formData.isCompleted}
                        onCheckedChange={(checked) => handleInputChange("isCompleted", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="needsPurchase">Needs Purchase</Label>
                      <Switch
                        id="needsPurchase"
                        checked={formData.needsPurchase}
                        onCheckedChange={(checked) => handleInputChange("needsPurchase", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="tosort">To Sort</Label>
                      <Switch
                        id="tosort"
                        checked={formData.tosort}
                        onCheckedChange={(checked) => handleInputChange("tosort", checked)}
                      />
                    </div>
                  </div>

                  {formData.isCompleted && (
                    <div className="space-y-2">
                      <Label htmlFor="completionDate">Completion Date</Label>
                      <Input
                        id="completionDate"
                        type="date"
                        value={formData.completionDate}
                        onChange={(e) => handleInputChange("completionDate", e.target.value)}
                        className="bg-background border-border"
                      />
                    </div>
                  )}

                  {formData.needsPurchase && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                        placeholder="0.00"
                        className="bg-background border-border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gameplay Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
                      <Input
                        id="estimatedDuration"
                        type="number"
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange("estimatedDuration", e.target.value)}
                        placeholder="0"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actualPlaytime">Actual Playtime (hours)</Label>
                      <Input
                        id="actualPlaytime"
                        type="number"
                        value={formData.actualPlaytime}
                        onChange={(e) => handleInputChange("actualPlaytime", e.target.value)}
                        placeholder="0"
                        className="bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievements">Number of Achievements</Label>
                    <Input
                      id="achievements"
                      type="number"
                      value={formData.achievements}
                      onChange={(e) => handleInputChange("achievements", e.target.value)}
                      placeholder="0"
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment">Comments</Label>
                    <Textarea
                      id="comment"
                      value={formData.comment}
                      onChange={(e) => handleInputChange("comment", e.target.value)}
                      placeholder="Your thoughts about the game..."
                      rows={4}
                      className="bg-background border-border"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>External Integrations</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="retroAchievementUrl">RetroAchievements URL</Label>
                     <div className="flex gap-2">
                       <Input
                         id="retroAchievementUrl"
                         type="url"
                         value={formData.retroAchievementUrl}
                         onChange={(e) => handleInputChange("retroAchievementUrl", e.target.value)}
                         placeholder="https://retroachievements.org/game/..."
                         className="bg-background border-border"
                       />
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={handleFetchRAData}
                         disabled={isFetchingRA || !formData.retroAchievementUrl || !game?.id}
                         title="Fetch achievements count from RetroAchievements"
                       >
                         {isFetchingRA ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <Download className="h-4 w-4" />
                         )}
                       </Button>
                     </div>
                     {isFetchingRA && (
                       <p className="text-sm text-muted-foreground">Fetching achievements from RetroAchievements...</p>
                     )}
                     {!game?.id && formData.retroAchievementUrl && (
                       <p className="text-sm text-yellow-600 dark:text-yellow-400">
                         Save the game first to fetch achievements data.
                       </p>
                     )}
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="howLongToBeatUrl">HowLongToBeat URL</Label>
                     <div className="flex gap-2">
                       <Input
                         id="howLongToBeatUrl"
                         type="url"
                         value={formData.howLongToBeatUrl}
                         onChange={(e) => handleInputChange("howLongToBeatUrl", e.target.value)}
                         placeholder="https://howlongtobeat.com/game/..."
                         className="bg-background border-border"
                       />
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={handleSearchHLTB}
                         disabled={isSearchingHLTB || !formData.title}
                         title="Search for game on HowLongToBeat"
                       >
                         {isSearchingHLTB ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <Search className="h-4 w-4" />
                         )}
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={handleFetchHLTBData}
                         disabled={isFetchingHLTB || !formData.howLongToBeatUrl}
                         title="Fetch cover art and duration from HowLongToBeat"
                       >
                         {isFetchingHLTB ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <Download className="h-4 w-4" />
                         )}
                       </Button>
                     </div>
                     {isSearchingHLTB && (
                       <p className="text-sm text-muted-foreground">Searching HowLongToBeat...</p>
                     )}
                     {isFetchingHLTB && (
                       <p className="text-sm text-muted-foreground">Fetching data from HowLongToBeat...</p>
                     )}
                   </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Saving..." : (game ? "Update Game" : "Add Game")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Search Results Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Results - HowLongToBeat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {searchResults.map((game, index) => (
              <div 
                key={game.id || index}
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-secondary/20 cursor-pointer transition-colors"
                onClick={() => handleSelectSearchResult(game)}
              >
                {game.imageUrl && (
                  <img 
                    src={game.imageUrl} 
                    alt={game.title}
                    className="w-12 h-16 object-contain bg-muted rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{game.title}</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {game.mainStory > 0 && (
                      <span className="mr-3">Main Story: {game.mainStory}h</span>
                    )}
                    {game.platforms && (
                      <span>Platforms: {game.platforms}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {game.url}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};