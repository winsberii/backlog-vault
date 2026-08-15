import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Loader2, Save } from "lucide-react";

export const ReleaseWebhookSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_settings")
        .select("release_webhook_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading settings:", error);
      } else {
        setWebhookUrl(data?.release_webhook_url || "");
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = webhookUrl.trim();

    if (trimmed && !/^https?:\/\/.+/i.test(trimmed)) {
      toast({
        title: "Invalid URL",
        description: "Webhook URL must start with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, release_webhook_url: trimmed || null },
        { onConflict: "user_id" }
      );
    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save webhook URL", variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Release notification webhook updated." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Release Notifications
        </CardTitle>
        <CardDescription>
          When a game reaches its release date, a POST request is sent to this URL with the game details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="releaseWebhookUrl">Webhook URL</Label>
          <Input
            id="releaseWebhookUrl"
            type="url"
            placeholder="https://example.com/hooks/game-released"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={isLoading}
            className="bg-background border-border"
          />
          <p className="text-xs text-muted-foreground">
            Payload: {"{ event, userId, game: { id, title, releaseDate, platform } }"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};
