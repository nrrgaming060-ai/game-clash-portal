import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { watchAllTransactions } from "@/services/db";
import type { Transaction } from "@/lib/types";
import { inr, formatDateTime } from "@/lib/time";

export const Route = createFileRoute("/admin/transactions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transactions — ClashArena Admin" },
      { name: "description", content: "Full wallet transaction ledger across all players." },
      { property: "og:title", content: "Transactions — ClashArena Admin" },
      { property: "og:description", content: "Global wallet ledger." },
    ],
  }),
  component: AdminTransactions,
});

function AdminTransactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => watchAllTransactions(setTxs), []);

  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold">Transactions</h1>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {txs.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 text-sm">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
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
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t.note}</span>
              <span className="block text-[11px] text-muted-foreground">
                {formatDateTime(t.createdAt)} · {t.wallet} wallet
              </span>
            </span>
            <span
              className={`font-display font-bold ${
                t.type === "credit" ? "text-success" : "text-destructive"
              }`}
            >
              {t.type === "credit" ? "+" : "-"}
              {inr(t.amount)}
            </span>
          </div>
        ))}
        {txs.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
