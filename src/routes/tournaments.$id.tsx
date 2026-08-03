import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Lock, MapPin, Swords, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Countdown, StatusBadge } from "@/components/TournamentCard";
import { CardSkeleton, EmptyState } from "@/components/States";
import { useAuth } from "@/contexts/AuthContext";
import { inr, tsToDate, formatDateTime } from "@/lib/time";
import {
  joinTournament,
  watchRoom,
  watchTournament,
  watchTournamentPlayers,
} from "@/services/db";
import type { JoinedPlayer, Room, Tournament } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/tournaments/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Match details — ClashArena" },
      {
        name: "description",
        content: "Prize breakdown, rules, slots and room credentials for this ClashArena match.",
      },
      { property: "og:title", content: "Match details — ClashArena" },
      { property: "og:description", content: "Join this ClashArena esports match." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <TournamentDetail />
    </RequireAuth>
  ),
});

function TournamentDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [t, setT] = useState<Tournament | null | undefined>(undefined);
  const [players, setPlayers] = useState<JoinedPlayer[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => watchTournament(id, setT), [id]);
  useEffect(() => watchTournamentPlayers(id, setPlayers), [id]);
  useEffect(() => watchRoom(id, setRoom, () => setRoom(null)), [id]);

  const joined = useMemo(
    () => players.some((p) => p.userId === profile?.uid),
    [players, profile?.uid],
  );

  if (t === undefined)
    return (
      <AppShell>
        <CardSkeleton />
      </AppShell>
    );
  if (!t)
    return (
      <AppShell>
        <EmptyState title="Match not found" description="This tournament may have been removed." />
      </AppShell>
    );

  const filled = Math.min(100, Math.round(((t.joinedSlots ?? 0) / (t.totalSlots || 1)) * 100));
  const full = (t.joinedSlots ?? 0) >= t.totalSlots;
  const closed = t.status === "COMPLETED" || t.status === "CANCELLED";
  const balance = (profile?.depositBalance ?? 0) + (profile?.winBalance ?? 0);

  const onJoin = async () => {
    if (!profile) return;
    if (balance < t.entryFee) {
      toast.error("Not enough balance. Add funds to your wallet.");
      navigate({ to: "/wallet" });
      return;
    }
    setBusy(true);
    try {
      await joinTournament({ tournament: t, user: profile });
      toast.success("You're in! Room details unlock before the match.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-44 bg-surface-2">
          {t.bannerUrl ? (
            <img src={t.bannerUrl} alt={`${t.title} banner`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center arena-grid">
              <Swords className="h-10 w-10 text-primary" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <StatusBadge status={t.status} />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h1 className="font-display text-xl font-bold">{t.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t.gameName}</span>·<span>{t.category}</span>·
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {t.map}
              </span>
              ·<span>{formatDateTime(t.startTime)}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Prize pool", inr(t.prizePool), "text-gold"],
              ["Entry fee", inr(t.entryFee), "text-primary"],
              ["Per kill", inr(t.perKill), ""],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-surface-2 p-3 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">{l}</p>
                <p className={`font-display font-bold ${c}`}>{v}</p>
              </div>
            ))}
            <div className="rounded-xl bg-surface-2 p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Starts in</p>
              <p className="font-display font-bold">
                <Countdown to={tsToDate(t.startTime)} />
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {t.joinedSlots ?? 0}/{t.totalSlots} slots filled
              </span>
              <span>{filled}%</span>
            </div>
            <Progress value={filled} className="h-2" />
          </div>
        </div>
      </div>

      {joined && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h2 className="font-display text-sm font-semibold text-primary">Room credentials</h2>
          {room?.isUnlocked && room.roomId ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([
                ["Room ID", room.roomId],
                ["Password", room.roomPassword],
              ] as const).map(([l, v]) => (
                <button
                  key={l}
                  onClick={() => {
                    void navigator.clipboard.writeText(v);
                    toast.success(`${l} copied`);
                  }}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-left"
                >
                  <span>
                    <span className="block text-[10px] uppercase text-muted-foreground">{l}</span>
                    <span className="font-mono font-semibold">{v}</span>
                  </span>
                  <Copy className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" /> Unlocks shortly before the match starts.
            </p>
          )}
        </div>
      )}

      <Tabs defaultValue="rules" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 bg-surface-2">
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="players">Players ({players.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="pt-3">
          <ul className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            {(t.rules?.length ? t.rules : ["Standard tournament rules apply."]).map((r, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground">
                <span className="text-primary">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="players" className="pt-3">
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {players.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No players registered yet.</p>
            )}
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="font-medium">{p.userName}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {p.playerGameUid}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-[68px] z-30 glass border-t border-border/70 p-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="text-xs text-muted-foreground">
            <p>Wallet</p>
            <p className="font-display text-base font-bold text-gold">{inr(balance)}</p>
          </div>
          <Button
            className="ml-auto flex-1 bg-gradient-primary font-semibold"
            disabled={joined || full || closed || busy}
            onClick={() => void onJoin()}
          >
            {joined
              ? "Already joined"
              : closed
                ? "Registration closed"
                : full
                  ? "Slots full"
                  : `Join for ${inr(t.entryFee)}`}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
