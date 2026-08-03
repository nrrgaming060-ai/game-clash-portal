import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Refer & earn — ClashArena" },
      {
        name: "description",
        content: "Share your ClashArena referral code and earn wallet bonuses for every friend.",
      },
      { property: "og:title", content: "Refer & earn — ClashArena" },
      { property: "og:description", content: "Invite friends and earn ClashArena wallet credit." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Refer />
    </RequireAuth>
  ),
});

function Refer() {
  const { profile } = useAuth();
  const code = profile?.referralCode ?? "";

  const share = async () => {
    const text = `Join me on ClashArena and get a bonus! Use my referral code: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "ClashArena", text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Invite copied to clipboard");
  };

  return (
    <AppShell title="Refer & earn">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center glow-primary">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Gift className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Invite friends, earn ₹5 each</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You and your friend both get ₹5 in deposit balance when they sign up with your code.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-gold/50 bg-surface-2 p-3">
          <span className="flex-1 font-display text-xl font-bold tracking-widest text-gold">
            {code || "—"}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Copy referral code"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Code copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Button className="mt-4 w-full bg-gradient-primary" onClick={() => void share()}>
          <Share2 className="mr-2 h-4 w-4" /> Share invite
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {[
          ["Share your code", "Send it to teammates on WhatsApp, Discord or Instagram."],
          ["They sign up", "Your friend enters the code while completing their profile."],
          ["Both get paid", "₹5 lands in each deposit wallet, instantly usable for entry fees."],
        ].map(([t, b], i) => (
          <div key={t} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold">{t}</span>
              <span className="block text-sm text-muted-foreground">{b}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Referral bonuses are credited to deposit balance and are
        not directly withdrawable.
      </p>
    </AppShell>
  );
}
