import { useState } from "react";
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

interface GameFormProps {
  game?: any;
  onClose: () => void;
}

export const GameForm = ({ game, onClose }: GameFormProps) => {
  const { toast } = useToast();
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Implement actual save functionality
    console.log("Saving game:", formData);
    
    toast({
      title: game ? "Game updated" : "Game added",
      description: `${formData.title} has been ${game ? "updated" : "added"} successfully.`,
    });
    
    onClose();
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
                          <SelectItem value="PC">PC</SelectItem>
                          <SelectItem value="PlayStation 5">PlayStation 5</SelectItem>
                          <SelectItem value="Xbox Series X/S">Xbox Series X/S</SelectItem>
                          <SelectItem value="Nintendo Switch">Nintendo Switch</SelectItem>
                          <SelectItem value="Steam Deck">Steam Deck</SelectItem>
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
                          <SelectItem value="Steam">Steam</SelectItem>
                          <SelectItem value="Epic Games">Epic Games</SelectItem>
                          <SelectItem value="GOG">GOG</SelectItem>
                          <SelectItem value="PlayStation 5">PlayStation 5</SelectItem>
                          <SelectItem value="Xbox Game Pass">Xbox Game Pass</SelectItem>
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
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {game ? "Update Game" : "Add Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};