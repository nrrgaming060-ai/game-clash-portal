import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IndianRupee, Swords, Users, Wallet } from "lucide-react";
import { listUsers, watchAllRequests, watchTournaments } from "@/services/db";
import type { MoneyRequest, Tournament, UserProfile } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";
import { StatusBadge } from "@/components/TournamentCard";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin overview — ClashArena" },
      { name: "description", content: "Platform analytics for ClashArena tournament operators." },
      { property: "og:title", content: "Admin overview — ClashArena" },
      { property: "og:description", content: "ClashArena operator dashboard." },
    ],
  }),
  component: AdminHome,
});

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AdminHome() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => watchTournaments(setTournaments), []);
  useEffect(() => watchAllRequests(setRequests), []);
  useEffect(() => {
    void listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const live = tournaments.filter((t) => t.status === "LIVE").length;
  const pending = requests.filter((r) => r.status === "pending");
  const revenue = tournaments.reduce((s, t) => s + (t.joinedSlots ?? 0) * (t.entryFee ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Registered players"
          value={String(users.length)}
          accent="bg-primary/15 text-primary"
        />
        <Stat
          icon={Swords}
          label={`Tournaments (${live} live)`}
          value={String(tournaments.length)}
          accent="bg-gold/15 text-gold"
        />
        <Stat
          icon={IndianRupee}
          label="Entry fee volume"
          value={inr(revenue)}
          accent="bg-success/15 text-success"
        />
        <Stat
          icon={Wallet}
          label="Pending money requests"
          value={String(pending.length)}
          accent="bg-warning/15 text-warning"
        />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Latest tournaments</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {tournaments.slice(0, 8).map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{t.title}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t.gameName} · {formatDateTime(t.startTime)}
                </span>
              </span>
              <span className="ml-auto shrink-0 text-right text-xs text-muted-foreground">
                {t.joinedSlots ?? 0}/{t.totalSlots}
              </span>
              <StatusBadge status={t.status} />
            </div>
          ))}
          {tournaments.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No tournaments created yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Pending wallet requests</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {pending.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="capitalize">{r.kind}</span>
              <span className="text-muted-foreground">{r.userName}</span>
              <span className="ml-auto font-semibold">{inr(r.amount)}</span>
            </div>
          ))}
          {pending.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nothing waiting for approval.</p>
          )}
        </div>
      </section>
    </div>
  );
}
