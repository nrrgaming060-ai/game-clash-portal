import { createFileRoute } from "@tanstack/react-router";
import { Image, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Advertisement, AdPlacement } from "@/lib/types";
import {
  createAdvertisement,
  deleteAdvertisement,
  updateAdvertisement,
  watchAdvertisements,
} from "@/services/db";

export const Route = createFileRoute("/admin/advertisements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Advertisements — ClashArena Admin" },
      { name: "description", content: "Create and schedule ClashArena promotional banners." },
      { property: "og:title", content: "Advertisements — ClashArena Admin" },
      { property: "og:description", content: "Manage ClashArena promotional banners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAdvertisements,
});

const optionalUrl = z.union([z.literal(""), z.string().trim().url().startsWith("https://")]);
const schema = z
  .object({
    title: z.string().trim().min(2, "Enter an ad title").max(120),
    imageUrl: optionalUrl,
    linkUrl: optionalUrl,
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
  });

type FormState = {
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  startDate: string;
  endDate: string;
  active: boolean;
};

const EMPTY: FormState = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  placement: "header",
  startDate: "",
  endDate: "",
  active: true,
};

const PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: "header", label: "Header" },
  { value: "home", label: "Home feed" },
  { value: "tournament", label: "Tournament pages" },
];

function AdminAdvertisements() {
  const [items, setItems] = useState<Advertisement[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => watchAdvertisements(setItems), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      placement: ad.placement,
      startDate: ad.startDate ?? "",
      endDate: ad.endDate ?? "",
      active: ad.active,
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the ad details");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...parsed.data, placement: form.placement, active: form.active };
      if (editing) await updateAdvertisement(editing.id, payload);
      else await createAdvertisement(payload);
      toast.success(editing ? "Advertisement updated" : "Advertisement created");
      setOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ad: Advertisement) => {
    if (!confirm(`Delete "${ad.title}"?`)) return;
    try {
      await deleteAdvertisement(ad.id);
      toast.success("Advertisement deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Advertisements</h1>
          <p className="text-sm text-muted-foreground">Schedule promotional banners across the app.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto bg-gradient-gold text-background" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit advertisement" : "New advertisement"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ad-title">Title *</Label>
                <Input id="ad-title" maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-image">Image URL</Label>
                <Input id="ad-image" type="url" inputMode="url" placeholder="https://…" maxLength={2048} value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
                <p className="text-xs text-muted-foreground">Paste a secure direct image URL for the banner.</p>
              </div>
              {form.imageUrl && <img src={form.imageUrl} alt="Advertisement preview" className="aspect-[16/6] w-full rounded-lg border border-border object-cover" />}
              <div className="space-y-1.5">
                <Label htmlFor="ad-link">Link URL</Label>
                <Input id="ad-link" type="url" inputMode="url" placeholder="https://…" maxLength={2048} value={form.linkUrl} onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(value) => setForm((current) => ({ ...current, placement: value as AdPlacement }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLACEMENTS.map((placement) => <SelectItem key={placement.value} value={placement.value}>{placement.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-start">Start date</Label>
                  <Input id="ad-start" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-end">End date</Label>
                  <Input id="ad-end" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="ad-active">Active</Label>
                <Switch id="ad-active" checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} />
              </div>
              <Button className="w-full bg-gradient-gold text-background" disabled={busy} onClick={() => void save()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create advertisement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((ad) => (
          <article key={ad.id} className="overflow-hidden rounded-lg border border-border bg-card">
            {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="aspect-[16/7] w-full object-cover" /> : <div className="grid aspect-[16/7] place-items-center bg-surface-2"><Image className="h-8 w-8 text-muted-foreground" /></div>}
            <div className="p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{ad.title}</h2>
                  <p className="text-xs capitalize text-muted-foreground">{ad.placement} · {ad.active ? "Active" : "Inactive"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ad.startDate || "Any time"} — {ad.endDate || "No end date"}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Edit ${ad.title}`} onClick={() => openEdit(ad)}><Pencil className="h-4 w-4 text-primary" /></Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${ad.title}`} onClick={() => void remove(ad)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No advertisements yet.</div>}
      </div>
    </div>
  );
}