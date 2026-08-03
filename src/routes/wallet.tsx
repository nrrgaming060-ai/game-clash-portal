import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Loader2, Wallet as WalletIcon } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ListSkeleton } from "@/components/States";
import { useAuth } from "@/contexts/AuthContext";
import { createMoneyRequest, watchMyRequests, watchTransactions } from "@/services/db";
import type { MoneyRequest, Transaction } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wallet — ClashArena" },
      {
        name: "description",
        content: "Add funds, withdraw winnings and review every ClashArena wallet transaction.",
      },
      { property: "og:title", content: "Wallet — ClashArena" },
      { property: "og:description", content: "Manage your ClashArena balance and payouts." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <WalletPage />
    </RequireAuth>
  ),
});

const amountSchema = z.coerce.number().min(10, "Minimum ₹10").max(100000, "Maximum ₹1,00,000");
const refSchema = z.string().trim().min(4, "Enter a valid UPI ID or reference").max(80);

function StatusPill({ status }: { status: MoneyRequest["status"] }) {
  const cls =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "rejected"
        ? "bg-destructive/15 text-destructive"
        : "bg-warning/15 text-warning";
  return <Badge className={`border-0 capitalize ${cls}`}>{status}</Badge>;
}

function WalletPage() {
  const { profile } = useAuth();
  const [txs, setTxs] = useState<Transaction[] | null>(null);
  const [reqs, setReqs] = useState<MoneyRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState({ amount: "", ref: "" });
  const [out, setOut] = useState({ amount: "", ref: "" });

  useEffect(() => {
    if (!profile) return;
    const a = watchTransactions(profile.uid, setTxs);
    const b = watchMyRequests(profile.uid, setReqs);
    return () => {
      a();
      b();
    };
  }, [profile?.uid]);

  const deposit = profile?.depositBalance ?? 0;
  const win = profile?.winBalance ?? 0;

  const submit = async (kind: "deposit" | "withdrawal") => {
    if (!profile) return;
    const src = kind === "deposit" ? add : out;
    const amt = amountSchema.safeParse(src.amount);
    const ref = refSchema.safeParse(src.ref);
    if (!amt.success) {
      toast.error(amt.error.issues[0]!.message);
      return;
    }
    if (!ref.success) {
      toast.error(ref.error.issues[0]!.message);
      return;
    }
    if (kind === "withdrawal" && amt.data > win) {
      toast.error("You can only withdraw from your winnings balance");
      return;
    }

    setBusy(true);
    try {
      await createMoneyRequest({
        userId: profile.uid,
        userName: profile.name,
        kind,
        amount: amt.data,
        method: "UPI",
        accountRef: ref.data,
      });
      toast.success(
        kind === "deposit"
          ? "Deposit request submitted for review"
          : "Withdrawal request submitted",
      );
      if (kind === "deposit") setAdd({ amount: "", ref: "" });
      else setOut({ amount: "", ref: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Wallet" showWallet={false}>
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 glow-gold">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <WalletIcon className="h-4 w-4" /> Total balance
        </p>
        <p className="mt-1 font-display text-4xl font-black text-gradient-gold">
          {inr(deposit + win)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Deposit</p>
            <p className="font-display font-bold text-primary">{inr(deposit)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Usable for entry fees</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Winnings</p>
            <p className="font-display font-bold text-success">{inr(win)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Withdrawable</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="add" className="mt-5">
        <TabsList className="grid w-full grid-cols-3 bg-surface-2">
          <TabsTrigger value="add">Add money</TabsTrigger>
          <TabsTrigger value="out">Withdraw</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-3 pt-4">
          <div className="flex gap-2">
            {[50, 100, 250, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAdd((s) => ({ ...s, amount: String(v) }))}
                className="flex-1 rounded-xl border border-border bg-surface-2 py-2 text-sm font-semibold"
              >
                ₹{v}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a1">Amount (₹)</Label>
            <Input
              id="a1"
              inputMode="numeric"
              value={add.amount}
              onChange={(e) => setAdd((s) => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a2">UPI ID / payment reference</Label>
            <Input
              id="a2"
              value={add.ref}
              onChange={(e) => setAdd((s) => ({ ...s, ref: e.target.value }))}
              placeholder="yourname@upi"
              maxLength={80}
            />
          </div>
          <Button
            className="w-full bg-gradient-primary"
            disabled={busy}
            onClick={() => void submit("deposit")}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit deposit request
          </Button>
          <p className="text-xs text-muted-foreground">
            Deposits are verified by an admin and credited to your deposit balance, usually within
            minutes.
          </p>
        </TabsContent>

        <TabsContent value="out" className="space-y-3 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="w1">Amount (₹)</Label>
            <Input
              id="w1"
              inputMode="numeric"
              value={out.amount}
              onChange={(e) => setOut((s) => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w2">Payout UPI ID</Label>
            <Input
              id="w2"
              value={out.ref}
              onChange={(e) => setOut((s) => ({ ...s, ref: e.target.value }))}
              placeholder="yourname@upi"
              maxLength={80}
            />
          </div>
          <Button
            className="w-full bg-gradient-gold text-background"
            disabled={busy}
            onClick={() => void submit("withdrawal")}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Request withdrawal
          </Button>
          <p className="text-xs text-muted-foreground">
            Only winnings can be withdrawn. Payouts are processed within 24 hours.
          </p>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          {reqs.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Requests</h3>
              {reqs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm"
                >
                  <span className="capitalize">{r.kind}</span>
                  <span className="font-semibold">{inr(r.amount)}</span>
                  <span className="ml-auto">
                    <StatusPill status={r.status} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {txs === null ? (
            <ListSkeleton rows={3} />
          ) : txs.length === 0 ? (
            <EmptyState title="No transactions yet" description="Your wallet activity shows here." />
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      t.type === "credit"
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {t.type === "credit" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{t.note}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatDateTime(t.createdAt)} · {t.wallet}
                    </span>
                  </span>
                  <span
                    className={`ml-auto font-display font-bold ${
                      t.type === "credit" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.type === "credit" ? "+" : "−"}
                    {inr(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
