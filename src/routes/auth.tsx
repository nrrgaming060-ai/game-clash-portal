import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ClashArena" },
      {
        name: "description",
        content: "Sign in to ClashArena with Google or email to join esports tournaments.",
      },
      { property: "og:title", content: "Sign in — ClashArena" },
      { property: "og:description", content: "Access your ClashArena player account." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});
const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2, "Name is too short").max(50),
});

function firebaseMessage(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/unauthorized-domain": "Add this preview domain to Firebase Auth authorised domains.",
    "auth/operation-not-allowed": "Enable this sign-in method in the Firebase console.",
  };
  return map[code] ?? (e as Error)?.message ?? "Something went wrong. Try again.";
}

function AuthPage() {
  const { user, configured, signInGoogle, signInEmail, signUpEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  if (user) return <Navigate to="/home" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(firebaseMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (mode: "in" | "up") => (e: React.FormEvent) => {
    e.preventDefault();
    const schema = mode === "in" ? signInSchema : signUpSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    void run(() =>
      mode === "in"
        ? signInEmail(form.email.trim(), form.password)
        : signUpEmail(form.name.trim(), form.email.trim(), form.password),
    );
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background arena-grid px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary font-display text-lg font-black text-primary-foreground glow-primary">
            CA
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Welcome to ClashArena</h1>
          <p className="text-sm text-muted-foreground">Sign in to join today's lobbies</p>
        </div>

        <div className="rounded-2xl glass p-6">
          <Button
            variant="outline"
            className="w-full gap-2 border-border bg-surface-2"
            disabled={busy}
            onClick={() => void run(signInGoogle)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.9h5.35c-.25 1.4-1.75 4.1-5.35 4.1a6 6 0 1 1 0-12 5.3 5.3 0 0 1 3.75 1.45l2-1.95A8.6 8.6 0 0 0 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.1-1.4-.3-2.1Z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="in">
            <TabsList className="grid w-full grid-cols-2 bg-surface-2">
              <TabsTrigger value="in">Sign in</TabsTrigger>
              <TabsTrigger value="up">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="in">
              <form className="space-y-3 pt-4" onSubmit={submit("in")}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-primary"
                  onClick={async () => {
                    const email = form.email.trim();
                    if (!z.string().email().safeParse(email).success) {
                      toast.error("Enter your email first");
                      return;
                    }
                    try {
                      await resetPassword(email);
                      toast.success("Password reset link sent");
                    } catch (e) {
                      toast.error(firebaseMessage(e));
                    }
                  }}
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="up">
              <form className="space-y-3 pt-4" onSubmit={submit("up")}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Player name</Label>
                  <Input id="name" value={form.name} onChange={set("name")} maxLength={50} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" value={form.email} onChange={set("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input
                    id="password2"
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you confirm you are 18+ and accept the tournament rules.
        </p>
      </div>
    </div>
  );
}
