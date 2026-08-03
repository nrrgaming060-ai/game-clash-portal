import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ListSkeleton } from "@/components/States";
import { useAuth } from "@/contexts/AuthContext";
import { watchLeaderboard } from "@/services/db";
import type { LeaderboardEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Leaderboard — ClashArena" },
      {
        name: "description",
        content: "See the top ClashArena players ranked by points, kills and tournament wins.",
      },
      { property: "og:title", content: "Leaderboard — ClashArena" },
      { property: "og:description", content: "Top ranked ClashArena esports players." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Leaderboard />
    </RequireAuth>
  ),
});

const PODIUM = [
  { icon: Crown, cls: "text-gold border-gold/50" },
  { icon: Medal, cls: "text-muted-foreground border-border" },
  { icon: Medal, cls: "text-warning border-warning/40" },
];

function Leaderboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => watchLeaderboard(setRows), []);

  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <AppShell title="Leaderboard">
      {rows === null ? (
        <ListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Rankings populate as soon as match results are published."
          icon={<Trophy className="h-8 w-8" />}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {top.map((r, i) => {
              const P = PODIUM[i]!;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "rounded-2xl border bg-card p-3 text-center",
                    P.cls,
                    i === 0 && "glow-gold",
                  )}
                >
                  <P.icon className={cn("mx-auto h-6 w-6", P.cls)} />
                  <p className="mt-2 truncate text-sm font-semibold">{r.userName}</p>
                  <p className="font-display text-lg font-bold text-gradient-gold">
                    {r.totalPoints}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{r.totalKills} kills</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
            {rest.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 p-3 text-sm",
                  r.userId === profile?.uid && "bg-primary/5",
                )}
              >
                <span className="w-7 text-center font-display font-bold text-muted-foreground">
                  {i + 4}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.userName}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {r.matchesPlayed} matches · {r.wins} wins
                  </span>
                </span>
                <span className="ml-auto text-right">
                  <span className="block font-display font-bold text-primary">
                    {r.totalPoints}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {r.totalKills} kills
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
