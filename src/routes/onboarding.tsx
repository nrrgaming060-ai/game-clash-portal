import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { applyReferral, updateProfile } from "@/services/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complete your profile — ClashArena" },
      {
        name: "description",
        content: "Add your in-game player ID to start joining ClashArena tournaments.",
      },
      { property: "og:title", content: "Complete your profile — ClashArena" },
      { property: "og:description", content: "Set up your ClashArena player profile." },
    ],
  }),
  component: () => (
    <RequireAuth requireProfile={false}>
      <Onboarding />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid phone number"),
  gameUid: z.string().trim().min(4, "Game UID looks too short").max(30),
});

const SLIDES = [
  {
    title: "Pick your battle",
    body: "Browse daily BGMI, Free Fire, Valorant and COD lobbies across Solo, Duo and Squad formats.",
  },
  {
    title: "Get the room, on time",
    body: "Room ID and password unlock automatically 15 minutes before your match begins.",
  },
  {
    title: "Win and withdraw",
    body: "Prize money lands in your winnings wallet. Request a payout whenever you like.",
  },
];

function Onboarding() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gameUid: "", referral: "" });

  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, name: f.name || profile.name || "" }));
  }, [profile]);

  if (profile?.profileComplete) return <Navigate to="/home" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.id, { ...parsed.data, profileComplete: true });
      if (form.referral.trim()) {
        try {
          await applyReferral(user.id, form.referral.trim().toLowerCase());
          toast.success("Referral bonus added");
        } catch (err) {
          toast.error((err as Error).message);
        }
      }
      toast.success("Profile ready. Let's play!");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step < SLIDES.length) {
    const slide = SLIDES[step]!;
    return (
      <div className="grid min-h-screen place-items-center bg-background arena-grid px-5">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary glow-primary">
            <Sparkles className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">{slide.title}</h1>
          <p className="mt-3 text-muted-foreground">{slide.body}</p>
          <div className="mt-8 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-3 bg-border"}`}
              />
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setStep(SLIDES.length)}
            >
              Skip
            </Button>
            <Button className="flex-1 bg-gradient-primary" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background arena-grid px-5 py-12">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl glass p-6">
        <h1 className="font-display text-2xl font-bold">Complete your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your in-game UID is required so we can add you to match lobbies.
        </p>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="n">Player name</Label>
            <Input id="n" value={form.name} onChange={set("name")} maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Phone number</Label>
            <Input id="p" value={form.phone} onChange={set("phone")} maxLength={15} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g">In-game player ID (UID)</Label>
            <Input
              id="g"
              value={form.gameUid}
              onChange={set("gameUid")}
              maxLength={30}
              placeholder="e.g. 5142398871"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r">Referral code (optional)</Label>
            <Input id="r" value={form.referral} onChange={set("referral")} maxLength={20} />
          </div>
        </div>
        <Button type="submit" className="mt-6 w-full bg-gradient-primary" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enter the arena
        </Button>
      </form>
    </div>
  );
}
