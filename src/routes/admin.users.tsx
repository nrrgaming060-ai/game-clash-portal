import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listUsers, updateProfile } from "@/services/db";
import type { UserProfile } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Players — ClashArena Admin" },
      { name: "description", content: "Search ClashArena players, review wallets and manage bans." },
      { property: "og:title", content: "Players — ClashArena Admin" },
      { property: "og:description", content: "Player management console." },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [q, setQ] = useState("");

  const load = () => {
    void listUsers()
      .then(setUsers)
      .catch((e: Error) => toast.error(e.message));
  };
  useEffect(load, []);

  const filtered = users.filter((u) =>
    [u.name, u.email, u.gameUid].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = async (u: UserProfile, patch: Partial<UserProfile>, msg: string) => {
    try {
      await updateProfile(u.uid, patch);
      toast.success(msg);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold">Players</h1>
      <Input
        className="mb-4 max-w-md"
        placeholder="Search by name, email or UID"
        value={q}
        maxLength={60}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {filtered.map((u) => (
          <div key={u.uid} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {u.name}
                {u.role === "admin" && (
                  <Badge className="ml-2 border-0 bg-gold/15 text-gold">admin</Badge>
                )}
                {u.banned && (
                  <Badge className="ml-2 border-0 bg-destructive/15 text-destructive">banned</Badge>
                )}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {u.email} · UID {u.gameUid || "—"} · joined {formatDateTime(u.joinedAt)}
              </span>
            </span>
            <span className="text-right text-xs">
              <span className="block text-primary">{inr(u.depositBalance ?? 0)} dep</span>
              <span className="block text-success">{inr(u.winBalance ?? 0)} win</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void toggle(
                  u,
                  { role: u.role === "admin" ? "user" : "admin" },
                  "Role updated",
                )
              }
            >
              {u.role === "admin" ? "Revoke admin" : "Make admin"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive"
              onClick={() => void toggle(u, { banned: !u.banned }, "Account updated")}
            >
              {u.banned ? "Unban" : "Ban"}
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No players found.</p>
        )}
      </div>
    </div>
  );
}
