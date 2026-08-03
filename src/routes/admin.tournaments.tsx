import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  createTournament,
  deleteTournament,
  saveRoom,
  updateTournament,
  watchTournaments,
  Timestamp,
} from "@/services/db";
import { uploadFile } from "@/services/storage";
import {
  CATEGORIES,
  GAMES,
  type Category,
  type GameName,
  type Tournament,
  type TournamentStatus,
} from "@/lib/types";
import { formatDateTime, inr, tsToDate } from "@/lib/time";
import { StatusBadge } from "@/components/TournamentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/tournaments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Manage tournaments — ClashArena Admin" },
      { name: "description", content: "Create, edit and publish ClashArena tournament lobbies." },
      { property: "og:title", content: "Manage tournaments — ClashArena Admin" },
      { property: "og:description", content: "Tournament management console." },
    ],
  }),
  component: AdminTournaments,
});

const STATUSES: TournamentStatus[] = ["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"];

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80),
  map: z.string().trim().min(2, "Enter a map").max(40),
  entryFee: z.coerce.number().min(0).max(100000),
  prizePool: z.coerce.number().min(0).max(10000000),
  perKill: z.coerce.number().min(0).max(100000),
  totalSlots: z.coerce.number().int().min(2, "At least 2 slots").max(200),
  startsAt: z.string().min(1, "Pick a start time"),
});

type FormState = {
  title: string;
  gameName: GameName;
  category: Category;
  map: string;
  entryFee: string;
  prizePool: string;
  perKill: string;
  totalSlots: string;
  startsAt: string;
  rules: string;
  bannerUrl: string;
  featured: boolean;
  status: TournamentStatus;
};

const EMPTY: FormState = {
  title: "",
  gameName: "BGMI",
  category: "Squad",
  map: "Erangel",
  entryFee: "20",
  prizePool: "1000",
  perKill: "10",
  totalSlots: "100",
  startsAt: "",
  rules: "No emulators\nNo teaming\nRecord your gameplay",
  bannerUrl: "",
  featured: false,
  status: "UPCOMING",
};

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function AdminTournaments() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  const [roomFor, setRoomFor] = useState<Tournament | null>(null);
  const [room, setRoom] = useState({ roomId: "", roomPassword: "", isUnlocked: false });

  useEffect(() => watchTournaments(setItems), []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (t: Tournament) => {
    setEditing(t);
    setForm({
      title: t.title,
      gameName: t.gameName,
      category: t.category,
      map: t.map,
      entryFee: String(t.entryFee),
      prizePool: String(t.prizePool),
      perKill: String(t.perKill),
      totalSlots: String(t.totalSlots),
      startsAt: toLocalInput(tsToDate(t.startTime)),
      rules: (t.rules ?? []).join("\n"),
      bannerUrl: t.bannerUrl ?? "",
      featured: !!t.featured,
      status: t.status,
    });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: parsed.data.title,
        gameName: form.gameName,
        category: form.category,
        map: parsed.data.map,
        entryFee: parsed.data.entryFee,
        prizePool: parsed.data.prizePool,
        perKill: parsed.data.perKill,
        totalSlots: parsed.data.totalSlots,
        bannerUrl: form.bannerUrl,
        rules: form.rules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        startTime: Timestamp.fromDate(new Date(parsed.data.startsAt)),
        status: form.status,
        featured: form.featured,
      };
      if (editing) await updateTournament(editing.id, payload);
      else await createTournament(payload);
      toast.success(editing ? "Tournament updated" : "Tournament published");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile("banners", file);
      setForm((f) => ({ ...f, bannerUrl: url }));
      toast.success("Banner uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveRoomDetails = async () => {
    if (!roomFor) return;
    if (room.roomId.trim().length < 3) {
      toast.error("Enter a valid room ID");
      return;
    }
    try {
      await saveRoom(roomFor.id, {
        roomId: room.roomId.trim(),
        roomPassword: room.roomPassword.trim(),
        isUnlocked: room.isUnlocked,
        unlockTime: roomFor.startTime ?? null,
      });
      toast.success("Room details saved");
      setRoomFor(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center">
        <h1 className="font-display text-xl font-bold">Tournaments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto bg-gradient-primary" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit tournament" : "Create tournament"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="t">Title</Label>
                <Input
                  id="t"
                  value={form.title}
                  maxLength={80}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Game</Label>
                  <Select
                    value={form.gameName}
                    onValueChange={(v) => setForm((f) => ({ ...f, gameName: v as GameName }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAMES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["map", "Map"],
                    ["totalSlots", "Total slots"],
                    ["entryFee", "Entry fee (₹)"],
                    ["prizePool", "Prize pool (₹)"],
                    ["perKill", "Per kill (₹)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as TournamentStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st">Start time</Label>
                <Input
                  id="st"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ru">Rules (one per line)</Label>
                <Textarea
                  id="ru"
                  rows={4}
                  value={form.rules}
                  onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bn">Banner image</Label>
                <Input id="bn" type="file" accept="image/*" onChange={onBanner} />
                {form.bannerUrl && (
                  <img
                    src={form.bannerUrl}
                    alt="Banner preview"
                    className="mt-2 h-24 w-full rounded-xl object-cover"
                  />
                )}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label htmlFor="fe">Feature on home carousel</Label>
                <Switch
                  id="fe"
                  checked={form.featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                />
              </div>
              <Button
                className="w-full bg-gradient-primary"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Publish tournament"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{t.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t.gameName} · {t.category} · {formatDateTime(t.startTime)} · {inr(t.prizePool)}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {t.joinedSlots ?? 0}/{t.totalSlots}
            </span>
            <StatusBadge status={t.status} />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Room details"
              onClick={() => {
                setRoomFor(t);
                setRoom({ roomId: "", roomPassword: "", isUnlocked: false });
              }}
            >
              <KeyRound className="h-4 w-4 text-gold" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => openEdit(t)}>
              <Pencil className="h-4 w-4 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete"
              onClick={() => {
                if (!confirm(`Delete "${t.title}"?`)) return;
                void deleteTournament(t.id)
                  .then(() => toast.success("Tournament deleted"))
                  .catch((e: Error) => toast.error(e.message));
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No tournaments yet.</p>
        )}
      </div>

      <Dialog open={!!roomFor} onOpenChange={(o) => !o && setRoomFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Room credentials — {roomFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rid">Room ID</Label>
              <Input
                id="rid"
                value={room.roomId}
                onChange={(e) => setRoom((r) => ({ ...r, roomId: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rpw">Room password</Label>
              <Input
                id="rpw"
                value={room.roomPassword}
                onChange={(e) => setRoom((r) => ({ ...r, roomPassword: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <Label htmlFor="unl">Release to joined players now</Label>
              <Switch
                id="unl"
                checked={room.isUnlocked}
                onCheckedChange={(v) => setRoom((r) => ({ ...r, isUnlocked: v }))}
              />
            </div>
            <Button
              className="w-full bg-gradient-gold text-background"
              onClick={() => void saveRoomDetails()}
            >
              Save room details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
