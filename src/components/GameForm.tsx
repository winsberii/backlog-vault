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
import { X, Upload, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GameFormProps {
  game?: any;
  onClose: () => void;
  onSave?: () => void;
}

export const GameForm = ({ game, onClose, onSave }: GameFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [storefronts, setStorefronts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: game?.title || "",
    platform: game?.platform || "",
    playthroughPlatform: game?.playthroughPlatform || "",
    coverImage: game?.coverImage || "",
    isCurrentlyPlaying: game?.isCurrentlyPlaying || false,
    isCompleted: game?.isCompleted || false,
    needsPurchase: game?.needsPurchase || false,
    estimatedDuration: game?.estimatedDuration || "",
    actualPlaytime: game?.actualPlaytime || "",
    completionDate: game?.completionDate || "",
    price: game?.price || "",
    comment: game?.comment || "",
    retroAchievementUrl: game?.retroAchievementUrl || "",
    howLongToBeatUrl: game?.howLongToBeatUrl || "",
  });

  // Fetch platforms and storefronts on component mount
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const { data: platformData } = await supabase
          .from('platforms')
          .select('*')
          .eq('type', 'platform')
          .order('name');
        
        const { data: storefrontData } = await supabase
          .from('platforms')
          .select('*')
          .eq('type', 'storefront')
          .order('name');

        setPlatforms(platformData || []);
        setStorefronts(storefrontData || []);
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
        retro_achievement_url: formData.retroAchievementUrl || null,
        how_long_to_beat_url: formData.howLongToBeatUrl || null,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement actual file upload
      const imageUrl = URL.createObjectURL(file);
      handleInputChange("coverImage", imageUrl);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {game ? "Edit Game" : "Add New Game"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="integration">Integration</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <SelectItem key={platform.id} value={platform.name}>
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
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {storefronts.map((storefront) => (
                            <SelectItem key={storefront.id} value={storefront.name}>
                              {storefront.name}
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
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="bg-background border-border"
                        />
                        <Button type="button" variant="outline" size="icon">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {formData.coverImage && (
                    <div className="mt-4">
                      <img 
                        src={formData.coverImage} 
                        alt="Cover preview" 
                        className="w-32 h-48 object-cover rounded border"
                      />
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
                    <Input
                      id="retroAchievementUrl"
                      type="url"
                      value={formData.retroAchievementUrl}
                      onChange={(e) => handleInputChange("retroAchievementUrl", e.target.value)}
                      placeholder="https://retroachievements.org/game/..."
                      className="bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="howLongToBeatUrl">HowLongToBeat URL</Label>
                    <Input
                      id="howLongToBeatUrl"
                      type="url"
                      value={formData.howLongToBeatUrl}
                      onChange={(e) => handleInputChange("howLongToBeatUrl", e.target.value)}
                      placeholder="https://howlongtobeat.com/game/..."
                      className="bg-background border-border"
                    />
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
    </Dialog>
  );
};