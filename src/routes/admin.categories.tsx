import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  watchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/db";
import type { CategoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categories — ClashArena Admin" },
      { name: "description", content: "Manage tournament categories like Solo, Duo and Squad." },
      { property: "og:title", content: "Categories — ClashArena Admin" },
      { property: "og:description", content: "Tournament category management." },
    ],
  }),
  component: AdminCategories,
});

function AdminCategories() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");

  useEffect(() => watchCategories(setItems), []);

  const add = async () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 30) {
      toast.error("Category name must be 2–30 characters");
      return;
    }
    try {
      await createCategory(n, items.length + 1);
      setName("");
      toast.success("Category added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggle = async (c: CategoryItem) => {
    try {
      await updateCategory(c.id, { active: !c.active });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (c: CategoryItem) => {
    try {
      await deleteCategory(c.id);
      toast.success("Category deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 font-display text-xl font-bold">Categories</h1>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="New category name"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <Button className="bg-gradient-gold text-background" onClick={() => void add()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="flex-1 font-medium">{c.name}</span>
            <Switch checked={c.active} onCheckedChange={() => void toggle(c)} />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={() => void remove(c)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No categories yet.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Inactive categories stay on existing tournaments but disappear from filters and new
        tournament forms.
      </p>
    </div>
  );
}
