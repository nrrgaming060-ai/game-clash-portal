import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { submitResult, watchTournamentPlayers, watchTournaments } from "@/services/db";
import type { JoinedPlayer, Tournament } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/results")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Publish results — ClashArena Admin" },
      { name: "description", content: "Enter kills, ranks and prize payouts for finished matches." },
      { property: "og:title", content: "Publish results — ClashArena Admin" },
      { property: "og:description", content: "Match result entry console." },
    ],
  }),
  component: AdminResults,
});

type Row = { kills: string; rank: string; points: string; prize: string };

function AdminResults() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tid, setTid] = useState<string>("");
  const [players, setPlayers] = useState<JoinedPlayer[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => watchTournaments(setTournaments), []);
  useEffect(() => {
    if (!tid) return;
    return watchTournamentPlayers(tid, setPlayers);
  }, [tid]);

  const get = (id: string): Row => rows[id] ?? { kills: "", rank: "", points: "", prize: "" };

  const save = async (p: JoinedPlayer) => {
    const r = get(p.id);
    setBusy(p.id);
    try {
      await submitResult({
        tournamentId: tid,
        join: p,
        kills: Number(r.kills) || 0,
        rank: Number(r.rank) || 0,
        points: Number(r.points) || 0,
        prize: Number(r.prize) || 0,
      });
      toast.success(`Saved result for ${p.userName}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold">Publish results</h1>
      <Select value={tid} onValueChange={setTid}>
        <SelectTrigger className="max-w-md">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {players.map((p) => {
          const r = get(p.id);
          return (
            <div key={p.id} className="flex flex-wrap items-end gap-2 p-3 text-sm">
              <span className="min-w-[140px] flex-1">
                <span className="block font-medium">{p.userName}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {p.playerGameUid}
                </span>
              </span>
              {(["kills", "rank", "points", "prize"] as const).map((k) => (
                <span key={k} className="w-20">
                  <span className="block text-[10px] uppercase text-muted-foreground">{k}</span>
                  <Input
                    inputMode="numeric"
                    value={r[k]}
                    onChange={(e) =>
                      setRows((s) => ({ ...s, [p.id]: { ...get(p.id), [k]: e.target.value } }))
                    }
                  />
                </span>
              ))}
              <Button
                size="sm"
                className="bg-gradient-primary"
                disabled={busy === p.id}
                onClick={() => void save(p)}
              >
                Save
              </Button>
            </div>
          );
        })}
        {tid && players.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No players joined this match.</p>
        )}
        {!tid && (
          <p className="p-4 text-sm text-muted-foreground">
            Choose a tournament to enter results.
          </p>
        )}
      </div>
    </div>
  );
}
