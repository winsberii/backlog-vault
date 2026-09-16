import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown } from "lucide-react";
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

interface Resolution {
  id: string;
  name: string;
  display_order: number;
}

export const ResolutionManager = () => {
  const { toast } = useToast();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchResolutions = async () => {
    const { data, error } = await supabase
      .from("resolutions")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({ title: "Error loading resolutions", description: error.message, variant: "destructive" });
    } else {
      setResolutions((data as Resolution[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchResolutions();
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const maxOrder = resolutions.length > 0 ? Math.max(...resolutions.map((r) => r.display_order)) : 0;

    const { error } = await supabase.from("resolutions").insert({
      name: trimmed,
      display_order: maxOrder + 1,
    });

    if (error) {
      toast({ title: "Error adding resolution", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      fetchResolutions();
      toast({ title: "Resolution added" });
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const { error } = await supabase.from("resolutions").update({ name: trimmed }).eq("id", id);

    if (error) {
      toast({ title: "Error renaming resolution", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchResolutions();
      toast({ title: "Resolution renamed" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("resolutions").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error deleting resolution", description: error.message, variant: "destructive" });
    } else {
      fetchResolutions();
      toast({ title: "Resolution deleted" });
    }
    setDeleteId(null);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= resolutions.length) return;

    const a = resolutions[index];
    const b = resolutions[swapIndex];

    const { error: e1 } = await supabase
      .from("resolutions")
      .update({ display_order: b.display_order })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("resolutions")
      .update({ display_order: a.display_order })
      .eq("id", b.id);

    if (e1 || e2) {
      toast({ title: "Error reordering", variant: "destructive" });
    } else {
      fetchResolutions();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading resolutions...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Manage Native Resolutions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="New resolution (e.g. 1080p)..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="shrink-0 gap-1">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="space-y-1">
          {resolutions.map((resolution, index) => (
            <div
              key={resolution.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 bg-card hover:bg-accent/30 transition-colors"
            >
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
                  disabled={index === resolutions.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                {editingId === resolution.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(resolution.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(resolution.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm truncate text-primary font-medium">{resolution.name}</span>
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setEditingId(resolution.id);
                  setEditingName(resolution.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => setDeleteId(resolution.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {resolutions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No resolutions yet. Add one above.</p>
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete resolution?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this resolution. Games using it will simply have no resolution set.
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
