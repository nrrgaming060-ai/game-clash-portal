import { createFileRoute } from "@tanstack/react-router";
import { Loader2, QrCode, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentSettings } from "@/lib/types";
import { inr } from "@/lib/time";
import { savePaymentSettings, watchPaymentSettings } from "@/services/db";
import { uploadFile } from "@/services/storage";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payments — ClashArena Admin" },
      {
        name: "description",
        content: "Set the UPI ID and QR code players use to add funds to ClashArena.",
      },
      { property: "og:title", content: "Payments — ClashArena Admin" },
      { property: "og:description", content: "Manage the UPI deposit details for ClashArena." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPayments,
});

const schema = z.object({
  upiId: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,64}@[a-zA-Z]{2,32}$/, "Enter a valid UPI ID, e.g. name@fam"),
  payeeName: z.string().trim().min(2, "Enter the name shown on your UPI account").max(60),
  note: z.string().trim().max(300),
  minDeposit: z.coerce.number().int().min(1).max(100000),
  maxDeposit: z.coerce.number().int().min(1).max(500000),
});

type Form = Omit<PaymentSettings, "id">;

const EMPTY: Form = {
  upiId: "",
  payeeName: "",
  qrUrl: "",
  note: "",
  minDeposit: 10,
  maxDeposit: 100000,
  depositsEnabled: true,
};

function AdminPayments() {
  const [id, setId] = useState<string | undefined>();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(
    () =>
      watchPaymentSettings((s) => {
        setLoaded(true);
        if (!s) return;
        setId((prev) => prev ?? s.id);
        setForm((prev) => (busy ? prev : { ...s }));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => ({ ...s, [k]: v }));

  const onQr = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile("payments", file);
      set("qrUrl", url);
      toast.success("QR uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    if (parsed.data.maxDeposit < parsed.data.minDeposit) {
      toast.error("Maximum must be greater than minimum");
      return;
    }
    setBusy(true);
    try {
      await savePaymentSettings({ ...form, ...parsed.data, id });
      toast.success("Payment details saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          These details are shown to players on the wallet screen when they add money.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
            <span>
              <span className="block text-sm font-medium">Deposits enabled</span>
              <span className="block text-[11px] text-muted-foreground">
                Turn off when you can&apos;t verify payments
              </span>
            </span>
            <Switch
              checked={form.depositsEnabled}
              onCheckedChange={(v) => set("depositsEnabled", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upi">UPI ID</Label>
            <Input
              id="upi"
              value={form.upiId}
              maxLength={80}
              placeholder="yourname@fam"
              onChange={(e) => set("upiId", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pn">Payee name</Label>
            <Input
              id="pn"
              value={form.payeeName}
              maxLength={60}
              placeholder="ClashArena"
              onChange={(e) => set("payeeName", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>UPI QR code</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 p-3 text-sm text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload QR image (PNG/JPG, max 5MB)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onQr(e.target.files?.[0])}
              />
            </label>
            {form.qrUrl && (
              <button
                type="button"
                className="text-xs text-destructive underline"
                onClick={() => set("qrUrl", "")}
              >
                Remove QR
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min">Min deposit (₹)</Label>
              <Input
                id="min"
                inputMode="numeric"
                value={String(form.minDeposit)}
                onChange={(e) => set("minDeposit", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Max deposit (₹)</Label>
              <Input
                id="max"
                inputMode="numeric"
                value={String(form.maxDeposit)}
                onChange={(e) => set("maxDeposit", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Instructions for players</Label>
            <Textarea
              id="note"
              rows={3}
              maxLength={300}
              value={form.note}
              placeholder="Pay to the UPI ID above, then paste the 12-digit UTR from your payment app."
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          <Button className="w-full bg-gradient-primary" disabled={busy || !loaded} onClick={() => void save()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save payment details
          </Button>
        </div>

        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <QrCode className="h-4 w-4" /> Player preview
          </p>
          {form.qrUrl ? (
            <img
              src={form.qrUrl}
              alt="UPI QR code players scan to deposit"
              className="mx-auto mt-3 h-48 w-48 rounded-xl bg-white object-contain p-2"
              loading="lazy"
            />
          ) : (
            <div className="mx-auto mt-3 grid h-48 w-48 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No QR uploaded
            </div>
          )}
          <p className="mt-3 text-center font-display text-lg font-bold">
            {form.upiId || "your-upi@bank"}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            {form.payeeName || "Payee name"}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {form.depositsEnabled
              ? `Deposits ${inr(form.minDeposit)} – ${inr(form.maxDeposit)}`
              : "Deposits are currently paused"}
          </p>
          {form.note && <p className="mt-3 text-xs text-muted-foreground">{form.note}</p>}
        </div>
      </div>
    </div>
  );
}
