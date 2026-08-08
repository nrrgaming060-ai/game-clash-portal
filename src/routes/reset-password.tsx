import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — ClashArena" },
      { name: "description", content: "Choose a new password for your ClashArena account." },
      { property: "og:title", content: "Set a new password — ClashArena" },
      { property: "og:description", content: "Reset your ClashArena account password." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match" });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });

  useEffect(() => {
    // The recovery link lands here with a recovery token in the URL hash.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const timer = window.setTimeout(() => {
      setReady((r) => {
        if (!r) setInvalid(true);
        return r;
      });
    }, 4000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your password");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password });
      if (error) throw error;
      toast.success("Password updated — sign in with your new password");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Could not update password. Try the link again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background arena-grid px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary font-display text-lg font-black text-primary-foreground glow-primary">
            CA
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a fresh password for your ClashArena account
          </p>
        </div>

        <div className="rounded-2xl glass p-6">
          {invalid ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </p>
              <Button asChild className="mt-4 w-full bg-gradient-primary">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : !ready ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying your reset link…
            </p>
          ) : (
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="np">New password</Label>
                <Input
                  id="np"
                  type="password"
                  value={form.password}
                  maxLength={72}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc">Confirm new password</Label>
                <Input
                  id="nc"
                  type="password"
                  value={form.confirm}
                  maxLength={72}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
