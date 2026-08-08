import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Gift,
  Landmark,
  Loader2,
  Smartphone,
  Upload,
  Wallet as WalletIcon,
} from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ListSkeleton } from "@/components/States";
import { useAuth } from "@/contexts/AuthContext";
import {
  createMoneyRequest,
  upiDeepLink,
  watchMyRequests,
  watchPaymentSettings,
  watchTransactions,
} from "@/services/db";
import { uploadFile } from "@/services/storage";
import type { MoneyRequest, PaymentSettings, PayoutMethod, Transaction } from "@/lib/types";
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

const upiSchema = z
  .string()
  .trim()
  .regex(/^[\w.\-]{2,}@[A-Za-z]{2,}$/, "Enter a valid UPI ID (e.g. name@upi)")
  .max(80);
const holderSchema = z.string().trim().min(2, "Enter the account holder name").max(60);
const accountSchema = z.string().trim().regex(/^\d{6,18}$/, "Enter a valid account number");
const ifscSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Enter a valid IFSC code (e.g. SBIN0123456)");
const utrSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{8,24}$/, "Enter the UTR / reference number from your payment app");

const PAYOUT_METHODS: { value: PayoutMethod; label: string; icon: typeof Landmark }[] = [
  { value: "upi", label: "UPI ID", icon: Smartphone },
  { value: "redeem", label: "Google Redeem Code", icon: Gift },
  { value: "bank", label: "Bank Account", icon: Landmark },
];

function StatusPill({ status }: { status: MoneyRequest["status"] }) {
  const cls =
    status === "approved" || status === "paid"
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
  const [pay, setPay] = useState<PaymentSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [add, setAdd] = useState({ amount: "", utr: "", proofUrl: "" });
  const [out, setOut] = useState({
    amount: "",
    method: "upi" as PayoutMethod,
    upiId: "",
    holder: "",
    account: "",
    ifsc: "",
  });

  useEffect(() => watchPaymentSettings(setPay), []);

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
  const min = pay?.minDeposit ?? 10;
  const max = pay?.maxDeposit ?? 100000;
  const amountSchema = z.coerce
    .number()
    .min(min, `Minimum ${inr(min)}`)
    .max(max, `Maximum ${inr(max)}`);

  const copyUpi = async () => {
    if (!pay?.upiId) return;
    try {
      await navigator.clipboard.writeText(pay.upiId);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Could not copy — please type it manually");
    }
  };

  const onProof = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image screenshot");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(`deposit-proofs/${profile?.uid}`, file);
      setAdd((s) => ({ ...s, proofUrl: url }));
      toast.success("Screenshot attached");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (kind: "deposit" | "withdrawal") => {
    if (!profile) return;
    const src = kind === "deposit" ? add : out;
    const amt = amountSchema.safeParse(src.amount);
    if (!amt.success) {
      toast.error(amt.error.issues[0]!.message);
      return;
    }

    let accountRef = "";
    let utr = "";
    let methodLabel = "UPI";
    let accountHolder = "";
    let accountNumber = "";
    let ifsc = "";
    if (kind === "deposit") {
      if (!pay?.depositsEnabled) {
        toast.error("Deposits are paused right now. Try again shortly.");
        return;
      }
      const u = utrSchema.safeParse(add.utr);
      if (!u.success) {
        toast.error(u.error.issues[0]!.message);
        return;
      }
      utr = u.data;
      accountRef = pay.upiId;
    } else {
      if (amt.data > win) {
        toast.error("You can only withdraw from your winnings balance");
        return;
      }
      if (out.method === "upi") {
        const u = upiSchema.safeParse(out.upiId);
        if (!u.success) {
          toast.error(u.error.issues[0]!.message);
          return;
        }
        accountRef = u.data;
        methodLabel = "UPI";
      } else if (out.method === "bank") {
        for (const s of [holderSchema.safeParse(out.holder), accountSchema.safeParse(out.account), ifscSchema.safeParse(out.ifsc)]) {
          if (!s.success) {
            toast.error(s.error.issues[0]!.message);
            return;
          }
        }
        accountHolder = out.holder.trim();
        accountNumber = out.account.trim();
        ifsc = out.ifsc.trim().toUpperCase();
        accountRef = `${accountNumber} · ${ifsc}`;
        methodLabel = "Bank Account";
      } else {
        accountRef = "Google Redeem Code";
        methodLabel = "Google Redeem Code";
      }
    }

    setBusy(true);
    try {
      await createMoneyRequest({
        userId: profile.uid,
        userName: profile.name,
        kind,
        amount: amt.data,
        method: methodLabel,
        accountRef,
        utr,
        proofUrl: kind === "deposit" ? add.proofUrl : "",
        payoutMethod: kind === "withdrawal" ? out.method : "upi",
        accountHolder,
        accountNumber,
        ifsc,
        redeemCode: "",
      });
      toast.success(
        kind === "deposit"
          ? "Deposit submitted — it will be credited once verified"
          : "Withdrawal request submitted",
      );
      if (kind === "deposit") setAdd({ amount: "", utr: "", proofUrl: "" });
      else setOut({ amount: "", method: out.method, upiId: "", holder: "", account: "", ifsc: "" });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(
        msg.includes("duplicate") || msg.includes("unique")
          ? "That transaction reference was already submitted"
          : msg,
      );
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
          {pay && !pay.depositsEnabled && (
            <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Deposits are paused right now. Please check back soon.
            </p>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            {pay?.qrUrl ? (
              <img
                src={pay.qrUrl}
                alt="Scan this UPI QR code to pay ClashArena"
                className="mx-auto h-44 w-44 rounded-xl bg-white object-contain p-2"
                loading="lazy"
              />
            ) : (
              <div className="mx-auto grid h-44 w-44 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                QR coming soon
              </div>
            )}
            <p className="mt-3 font-display text-lg font-bold">{pay?.upiId || "Not set yet"}</p>
            {pay?.payeeName && (
              <p className="text-xs text-muted-foreground">{pay.payeeName}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!pay?.upiId}
                onClick={() => void copyUpi()}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy UPI ID
              </Button>
              <Button
                asChild={!!pay?.upiId}
                className="flex-1 bg-gradient-gold text-background"
                disabled={!pay?.upiId}
              >
                {pay?.upiId ? (
                  <a href={upiDeepLink(pay, Number(add.amount) || 0)}>Pay via UPI app</a>
                ) : (
                  <span>Pay via UPI app</span>
                )}
              </Button>
            </div>
            {pay?.note && <p className="mt-3 text-xs text-muted-foreground">{pay.note}</p>}
          </div>

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
            <Label htmlFor="a1">Amount paid (₹)</Label>
            <Input
              id="a1"
              inputMode="numeric"
              value={add.amount}
              onChange={(e) => setAdd((s) => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a2">UTR / transaction reference</Label>
            <Input
              id="a2"
              value={add.utr}
              onChange={(e) => setAdd((s) => ({ ...s, utr: e.target.value }))}
              placeholder="12-digit UTR from your UPI app"
              maxLength={24}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment screenshot (optional)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 p-3 text-sm text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : add.proofUrl ? "Screenshot attached" : "Attach screenshot"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onProof(e.target.files?.[0])}
              />
            </label>
          </div>
          <Button
            className="w-full bg-gradient-primary"
            disabled={busy || uploading || !pay?.depositsEnabled}
            onClick={() => void submit("deposit")}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} I have paid — submit
          </Button>
          <p className="text-xs text-muted-foreground">
            Pay first, then submit the UTR. Once verified, the amount is credited to your deposit
            balance automatically — usually within minutes.
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
