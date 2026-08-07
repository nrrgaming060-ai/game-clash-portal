import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Search, Trophy } from "lucide-react";
import { watchLeaderboard } from "@/services/db";
import type { LeaderboardEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/leaderboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Leaderboard — ClashArena Admin" },
      {
        name: "description",
        content: "Review top ClashArena players by points, kills and tournament wins.",
      },
      { property: "og:title", content: "Leaderboard — ClashArena Admin" },
      { property: "og:description", content: "Top player rankings for ClashArena operators." },
    ],
  }),
  component: AdminLeaderboard,
});

type SortKey = "totalPoints" | "totalKills" | "wins";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "totalPoints", label: "Points" },
  { key: "totalKills", label: "Kills" },
  { key: "wins", label: "Wins" },
];

const PODIUM = [
  { icon: Crown, cls: "text-gold border-gold/50" },
  { icon: Medal, cls: "text-muted-foreground border-border" },
  { icon: Medal, cls: "text-warning border-warning/40" },
];

function AdminLeaderboard() {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("totalPoints");

  useEffect(() => watchLeaderboard(setRows), []);

  const list = useMemo(() => {
    const base = [...(rows ?? [])].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
    const term = q.trim().toLowerCase();
    return term ? base.filter((r) => r.userName.toLowerCase().includes(term)) : base;
  }, [rows, sort, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-bold">Top players</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search player"
              className="h-9 w-48 rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex rounded-xl border border-border bg-surface-2 p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium",
                  sort === s.key ? "bg-gold/15 text-gold" : "text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows === null ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading rankings…
        </div>
      ) : list.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground" />
          <p className="font-display font-semibold">No rankings yet</p>
          <p className="text-sm text-muted-foreground">
            Rankings appear as soon as match results are published.
          </p>
        </div>
      ) : (
        <>
          {!q && (
            <div className="grid grid-cols-3 gap-3">
              {list.slice(0, 3).map((r, i) => {
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
                    <p className="text-[10px] text-muted-foreground">
                      {r.totalKills} kills · {r.wins} wins
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Player</th>
                  <th className="p-3 text-right font-medium">Matches</th>
                  <th className="p-3 text-right font-medium">Wins</th>
                  <th className="p-3 text-right font-medium">Kills</th>
                  <th className="p-3 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((r, i) => (
                  <tr key={r.id}>
                    <td className="p-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium">{r.userName}</td>
                    <td className="p-3 text-right text-muted-foreground">{r.matchesPlayed}</td>
                    <td className="p-3 text-right text-muted-foreground">{r.wins}</td>
                    <td className="p-3 text-right text-muted-foreground">{r.totalKills}</td>
                    <td className="p-3 text-right font-display font-bold text-primary">
                      {r.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
