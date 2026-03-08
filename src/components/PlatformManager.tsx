import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface Platform {
  id: string;
  name: string;
  active: boolean;
  display_order: number;
}

export const PlatformManager = () => {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPlatforms = async () => {
    const { data, error } = await supabase
      .from("platforms")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Error loading platforms", description: error.message, variant: "destructive" });
    } else {
      setPlatforms((data as Platform[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const maxOrder = platforms.length > 0 ? Math.max(...platforms.map((p) => p.display_order)) : 0;

    const { error } = await supabase.from("platforms").insert({
      name: trimmed,
      active: true,
      display_order: maxOrder + 1,
    });

    if (error) {
      toast({ title: "Error adding platform", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      fetchPlatforms();
      toast({ title: "Platform added" });
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const { error } = await supabase.from("platforms").update({ name: trimmed }).eq("id", id);

    if (error) {
      toast({ title: "Error renaming platform", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchPlatforms();
      toast({ title: "Platform renamed" });
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("platforms").update({ active: !current }).eq("id", id);

    if (error) {
      toast({ title: "Error updating platform", description: error.message, variant: "destructive" });
    } else {
      fetchPlatforms();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("platforms").delete().eq("id", deleteId);

    if (error) {
      toast({
        title: "Error deleting platform",
        description: error.message.includes("violates foreign key")
          ? "This platform is used by existing games. Remove it from those games first."
          : error.message,
        variant: "destructive",
      });
    } else {
      fetchPlatforms();
      toast({ title: "Platform deleted" });
    }
    setDeleteId(null);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= platforms.length) return;

    const a = platforms[index];
    const b = platforms[swapIndex];

    const { error: e1 } = await supabase
      .from("platforms")
      .update({ display_order: b.display_order })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("platforms")
      .update({ display_order: a.display_order })
      .eq("id", b.id);

    if (e1 || e2) {
      toast({ title: "Error reordering", variant: "destructive" });
    } else {
      fetchPlatforms();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading platforms...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Manage Platforms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new platform */}
        <div className="flex gap-2">
          <Input
            placeholder="New platform name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="shrink-0 gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Platform list */}
        <div className="space-y-1">
          {platforms.map((platform, index) => (
            <div
              key={platform.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 bg-card hover:bg-accent/30 transition-colors"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === platforms.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingId === platform.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(platform.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(platform.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className={`text-sm truncate ${!platform.active ? "text-muted-foreground line-through" : ""}`}>
                    {platform.name}
                  </span>
                )}
              </div>

              {/* Active toggle */}
              <Switch
                checked={platform.active}
                onCheckedChange={() => handleToggleActive(platform.id, platform.active)}
                className="shrink-0"
              />

              {/* Edit */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setEditingId(platform.id);
                  setEditingName(platform.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {/* Delete */}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => setDeleteId(platform.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {platforms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No platforms yet. Add one above.</p>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete platform?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this platform. If it's used by existing games, deletion will fail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
