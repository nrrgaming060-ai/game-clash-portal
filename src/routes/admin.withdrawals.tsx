import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift, Landmark, Smartphone } from "lucide-react";
import { watchAllRequests, resolveRequest, markRequestPaid } from "@/services/db";
import type { MoneyRequest } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/withdrawals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Withdrawals — ClashArena Admin" },
      { name: "description", content: "Approve and pay out player withdrawals." },
      { property: "og:title", content: "Withdrawals — ClashArena Admin" },
      { property: "og:description", content: "Withdrawal approval and payout queue." },
    ],
  }),
  component: AdminWithdrawals,
});

const methodIcon = { upi: Smartphone, redeem: Gift, bank: Landmark } as const;

function PayoutDetails({ r }: { r: MoneyRequest }) {
  if (r.payoutMethod === "upi")
    return (
      <span className="block text-[11px] text-muted-foreground">UPI: {r.accountRef}</span>
    );
  if (r.payoutMethod === "bank")
    return (
      <span className="block text-[11px] text-muted-foreground">
        {r.accountHolder} · A/C {r.accountNumber} · {r.ifsc}
      </span>
    );
  return (
    <span className="block text-[11px] text-muted-foreground">
      Google Redeem Code{r.redeemCode ? ` · issued: ${r.redeemCode}` : ""}
    </span>
  );
}

function AdminWithdrawals() {
  const [items, setItems] = useState<MoneyRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(
    () => watchAllRequests((rows) => setItems(rows.filter((r) => r.kind === "withdrawal"))),
    [],
  );

  const act = async (r: MoneyRequest, approve: boolean) => {
    setBusy(r.id);
    try {
      await resolveRequest(r, approve);
      toast.success(
        approve ? "Withdrawal approved — winnings debited" : "Withdrawal rejected",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async (r: MoneyRequest) => {
    const code = (codes[r.id] ?? "").trim();
    if (r.payoutMethod === "redeem" && !code) {
      toast.error("Enter the Google Play redeem code you are issuing");
      return;
    }
    setBusy(r.id);
    try {
      await markRequestPaid(r.id, code);
      toast.success("Marked as paid");
      setCodes((c) => ({ ...c, [r.id]: "" }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold">Withdrawals</h1>
      <div className="space-y-2">
        {items.map((r) => {
          const Icon = methodIcon[r.payoutMethod] ?? Smartphone;
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-border bg-card p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2">
                  <Icon className="h-4 w-4 text-gold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.userName} · {r.method}
                  </span>
                  <PayoutDetails r={r} />
                  <span className="block text-[11px] text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </span>
                </span>
                <span className="font-display font-bold text-gold">{inr(r.amount)}</span>
                {r.status !== "pending" && r.status !== "approved" && (
                  <Badge className="border-0 capitalize">{r.status}</Badge>
                )}
              </div>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
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
                </div>
              )}

              {r.status === "approved" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.payoutMethod === "redeem" && (
                    <Input
                      className="h-9 flex-1 font-mono text-xs"
                      placeholder="Paste the redeem code you purchased"
                      value={codes[r.id] ?? ""}
                      onChange={(e) =>
                        setCodes((c) => ({ ...c, [r.id]: e.target.value }))
                      }
                      maxLength={40}
                    />
                  )}
                  <Button
                    size="sm"
                    className="bg-gradient-gold text-background"
                    disabled={busy === r.id}
                    onClick={() => void markPaid(r)}
                  >
                    Mark as paid
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No withdrawals.
          </p>
        )}
      </div>
    </div>
  );
}
