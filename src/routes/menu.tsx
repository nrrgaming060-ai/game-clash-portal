import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  Gift,
  ListChecks,
  LogOut,
  Shield,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/services/db";
import { uploadFile } from "@/services/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/menu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profile & settings — ClashArena" },
      {
        name: "description",
        content: "Update your ClashArena player profile, game UID, avatar and notification settings.",
      },
      { property: "og:title", content: "Profile & settings — ClashArena" },
      { property: "og:description", content: "Manage your ClashArena account." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MenuPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid phone number"),
  gameName: z.string().trim().min(2, "Enter your in-game name").max(30),
  gameUid: z.string().trim().min(4, "Game UID looks too short").max(30),
});

const LINKS = [
  { to: "/my-matches", label: "My matches", icon: ListChecks },
  { to: "/wallet", label: "Wallet & payouts", icon: Wallet },
  { to: "/refer", label: "Refer & earn", icon: Gift },
] as const;

function MenuPage() {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", gameName: "", gameUid: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile)
      setForm({ name: profile.name, phone: profile.phone, gameName: profile.gameName ?? "", gameUid: profile.gameUid });
  }, [profile?.uid]);

  if (!profile) return null;

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      await updateProfile(profile.uid, parsed.data);
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3 MB");
      return;
    }
    try {
      const url = await uploadFile(`avatars/${profile.uid}`, file);
      await updateProfile(profile.uid, { avatarUrl: url });
      toast.success("Avatar updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AppShell title="Menu">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <label className="relative cursor-pointer">
          <input type="file" accept="image/*" className="sr-only" onChange={onAvatar} />
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Your avatar"
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
              <UserIcon className="h-7 w-7" />
            </span>
          )}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background px-2 text-[10px] text-primary">
            edit
          </span>
        </label>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{profile.name}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          <p className="mt-1 text-xs text-gold">Code: {profile.referralCode}</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 p-4 text-sm">
            <Icon className="h-4 w-4 text-primary" />
            {label}
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" className="flex items-center gap-3 p-4 text-sm text-gold">
            <Shield className="h-4 w-4" />
            Admin panel
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-semibold">Edit profile</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mn">Player name</Label>
            <Input
              id="mn"
              value={form.name}
              maxLength={50}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp">Phone</Label>
            <Input
              id="mp"
              value={form.phone}
              maxLength={15}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgn">In-game name (IGN)</Label>
            <Input
              id="mgn"
              value={form.gameName}
              maxLength={30}
              onChange={(e) => setForm((f) => ({ ...f, gameName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mg">In-game UID</Label>
            <Input
              id="mg"
              value={form.gameUid}
              maxLength={30}
              onChange={(e) => setForm((f) => ({ ...f, gameUid: e.target.value }))}
            />
          </div>
          <Button className="w-full bg-gradient-primary" disabled={busy} onClick={() => void save()}>
            Save changes
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display font-semibold">Notifications</h2>
        {(
          [
            ["notifyMatches", "Match reminders"],
            ["notifyPromos", "Offers & promotions"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mt-3 flex items-center justify-between text-sm">
            <span>{label}</span>
            <Switch
              checked={profile[key] ?? true}
              onCheckedChange={(v) => void updateProfile(profile.uid, { [key]: v })}
            />
          </div>
        ))}
      </section>

      <Button
        variant="outline"
        className="mt-4 w-full border-destructive/40 text-destructive"
        onClick={async () => {
          await logout();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </AppShell>
  );
}
