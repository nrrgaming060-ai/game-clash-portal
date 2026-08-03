import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { TournamentCard } from "@/components/TournamentCard";
import { EmptyState, ListSkeleton } from "@/components/States";
import { useAuth } from "@/contexts/AuthContext";
import { watchMyJoins, watchTournaments } from "@/services/db";
import type { JoinedPlayer, Tournament } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/my-matches")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My matches — ClashArena" },
      {
        name: "description",
        content: "Track your upcoming lobbies, live matches and past ClashArena results.",
      },
      { property: "og:title", content: "My matches — ClashArena" },
      { property: "og:description", content: "Your ClashArena match history and results." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MyMatches />
    </RequireAuth>
  ),
});

function MyMatches() {
  const { profile } = useAuth();
  const [joins, setJoins] = useState<JoinedPlayer[] | null>(null);
  const [all, setAll] = useState<Tournament[]>([]);

  useEffect(() => {
    if (!profile) return;
    return watchMyJoins(profile.uid, setJoins);
  }, [profile?.uid]);
  useEffect(() => watchTournaments(setAll), []);

  const mine = useMemo(() => {
    if (!joins) return null;
    const ids = new Set(joins.map((j) => j.tournamentId));
    return all.filter((t) => ids.has(t.id));
  }, [joins, all]);

  const upcoming = mine?.filter((t) => t.status === "UPCOMING" || t.status === "LIVE") ?? [];
  const done = mine?.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED") ?? [];
  const results = useMemo(
    () => new Map((joins ?? []).map((j) => [j.tournamentId, j])),
    [joins],
  );

  return (
    <AppShell title="My matches">
      {mine === null ? (
        <ListSkeleton />
      ) : (
        <Tabs defaultValue="up">
          <TabsList className="grid w-full grid-cols-2 bg-surface-2">
            <TabsTrigger value="up">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="up" className="space-y-4 pt-4">
            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming matches"
                description="Join a lobby from the home feed to see it here."
              />
            ) : (
              upcoming.map((t) => <TournamentCard key={t.id} t={t} />)
            )}
          </TabsContent>
          <TabsContent value="done" className="space-y-4 pt-4">
            {done.length === 0 ? (
              <EmptyState title="No results yet" description="Finished matches appear here." />
            ) : (
              done.map((t) => {
                const r = results.get(t.id);
                return (
                  <div key={t.id}>
                    <TournamentCard t={t} />
                    {r && (
                      <div className="mt-1 grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center text-xs">
                        <span>
                          <span className="block text-muted-foreground">Rank</span>
                          <span className="font-display font-bold text-gold">
                            #{r.rank || "—"}
                          </span>
                        </span>
                        <span>
                          <span className="block text-muted-foreground">Kills</span>
                          <span className="font-display font-bold">{r.kills ?? 0}</span>
                        </span>
                        <span>
                          <span className="block text-muted-foreground">Points</span>
                          <span className="font-display font-bold text-primary">
                            {r.points ?? 0}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
