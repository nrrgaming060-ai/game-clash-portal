import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { TournamentCard } from "@/components/TournamentCard";
import { CardSkeleton, EmptyState } from "@/components/States";
import { watchTournaments } from "@/services/db";
import { CATEGORIES, GAMES, type Tournament } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tournament lobby — ClashArena" },
      {
        name: "description",
        content: "Browse live and upcoming esports tournaments and join a lobby in seconds.",
      },
      { property: "og:title", content: "Tournament lobby — ClashArena" },
      { property: "og:description", content: "Live and upcoming esports tournaments." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <HomePage />
    </RequireAuth>
  ),
});

const TABS = ["All", "Live", "Upcoming", "Completed"] as const;

function HomePage() {
  const [items, setItems] = useState<Tournament[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [game, setGame] = useState<string>("All");
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");

  useEffect(
    () =>
      watchTournaments(
        (t) => {
          setItems(t);
          setErr(null);
        },
        (e) => setErr(e.message),
      ),
    [],
  );

  const list = useMemo(() => {
    if (!items) return [];
    return items.filter((t) => {
      if (tab !== "All" && t.status !== tab.toUpperCase()) return false;
      if (game !== "All" && t.gameName !== game) return false;
      if (cat !== "All" && t.category !== cat) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, tab, game, cat, q]);

  const featured = useMemo(
    () => (items ?? []).filter((t) => t.featured && t.status !== "COMPLETED").slice(0, 5),
    [items],
  );

  return (
    <AppShell>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tournaments"
          className="pl-9"
          maxLength={60}
        />
      </div>

      {featured.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-display text-sm uppercase tracking-wider text-muted-foreground">
            Featured
          </h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {featured.map((t) => (
              <div key={t.id} className="w-[85%] shrink-0 snap-start sm:w-[60%]">
                <TournamentCard t={t} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sticky top-16 z-30 -mx-4 mb-4 bg-background/80 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                tab === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 text-xs">
          {["All", ...GAMES].map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1",
                game === g ? "bg-gold/15 text-gold" : "bg-surface-2 text-muted-foreground",
              )}
            >
              {g}
            </button>
          ))}
          <span className="w-px shrink-0 bg-border" />
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1",
                cat === c ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load tournaments: {err}
        </div>
      )}

      {items === null ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No tournaments here yet"
          description="Try a different filter — new lobbies are published throughout the day."
        />
      ) : (
        <div className="space-y-4">
          {list.map((t) => (
            <TournamentCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
