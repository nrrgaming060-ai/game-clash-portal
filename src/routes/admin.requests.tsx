import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { watchAllRequests, resolveRequest } from "@/services/db";
import type { MoneyRequest } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/requests")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet requests — ClashArena Admin" },
      { name: "description", content: "Approve deposits and withdrawals for ClashArena players." },
      { property: "og:title", content: "Wallet requests — ClashArena Admin" },
      { property: "og:description", content: "Deposit and withdrawal approval queue." },
    ],
  }),
  component: AdminRequests,
});

function AdminRequests() {
  const [items, setItems] = useState<MoneyRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => watchAllRequests(setItems), []);

  const act = async (r: MoneyRequest, approve: boolean) => {
    setBusy(r.id);
    try {
      await resolveRequest(r, approve);
      toast.success(approve ? "Request approved" : "Request rejected");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold">Wallet requests</h1>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {r.userName} · <span className="capitalize">{r.kind}</span>
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {r.method} · {r.accountRef} · {formatDateTime(r.createdAt)}
              </span>
            </span>
            <span className="font-display font-bold text-gold">{inr(r.amount)}</span>
            {r.status === "pending" ? (
              <span className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-success text-background"
                  disabled={busy === r.id}
                  onClick={() => void act(r, true)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive"
                  disabled={busy === r.id}
                  onClick={() => void act(r, false)}
                >
                  Reject
                </Button>
              </span>
            ) : (
              <Badge className="border-0 capitalize">{r.status}</Badge>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No requests.</p>}
      </div>
    </div>
  );
}
