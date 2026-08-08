import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Search } from "lucide-react";
import { listUsers, adminCredit } from "@/services/db";
import type { UserProfile } from "@/lib/types";
import { inr } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/credit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Manual credit — ClashArena Admin" },
      { name: "description", content: "Manually credit or adjust a player's deposit balance." },
      { property: "og:title", content: "Manual credit — ClashArena Admin" },
      { property: "og:description", content: "Admin wallet credit console." },
    ],
  }),
  component: AdminCredit,
});

const amountSchema = z.number().int().min(-100000).max(100000);

function AdminCredit() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listUsers().then(setUsers).catch((e) => toast.error((e as Error).message));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const apply = async () => {
    if (!selected) {
      toast.error("Pick a player first");
      return;
    }
    const amt = amountSchema.safeParse(Number(amount));
    if (!amt.success || amt.data === 0) {
      toast.error("Enter a non-zero whole amount (₹1 – ₹1,00,000)");
      return;
    }
    const r = reason.trim();
    if (r.length < 3 || r.length > 200) {
      toast.error("Give a short reason (3–200 characters)");
      return;
    }
    setBusy(true);
    try {
      await adminCredit(selected.uid, amt.data, r);
      toast.success(
        `${inr(amt.data)} ${amt.data > 0 ? "credited to" : "debited from"} ${selected.name}`,
      );
      setAmount("");
      setReason("");
      setUsers(await listUsers());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 font-display text-xl font-bold">Manual credit</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((u) => (
            <button
              key={u.uid}
              type="button"
              onClick={() => setSelected(u)}
              className={`block w-full px-3 py-2.5 text-left text-sm transition-colors ${
                selected?.uid === u.uid ? "bg-gold/10" : "hover:bg-surface-2"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {u.email}
                  </span>
                </span>
                <span className="shrink-0 font-display text-xs font-bold text-gold">
                  {inr(u.depositBalance)}
                </span>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No players found.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-bold">
          {selected ? `Credit ${selected.name}` : "Select a player"}
        </h2>
        {selected && (
          <p className="mt-1 text-xs text-muted-foreground">
            Current deposit balance: {inr(selected.depositBalance)}
          </p>
        )}
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="amt">Amount (₹)</Label>
            <Input
              id="amt"
              inputMode="numeric"
              placeholder="Positive to credit, negative to debit"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rsn">Reason</Label>
            <Input
              id="rsn"
              placeholder="e.g. Promo reward, refund, correction"
              value={reason}
              maxLength={200}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-gradient-gold text-background"
            disabled={busy || !selected}
            onClick={() => void apply()}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply credit
          </Button>
          <p className="text-xs text-muted-foreground">
            Recorded as an “Admin Credit” transaction and applied instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
