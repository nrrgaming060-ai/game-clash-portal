import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Gamepad2, ShieldCheck, Trophy, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClashArena — Daily Esports Tournaments & Cash Prizes" },
      {
        name: "description",
        content:
          "Join daily BGMI, Free Fire and Valorant tournaments on ClashArena. Real prize pools, instant room IDs, live leaderboards and fast withdrawals.",
      },
      { property: "og:title", content: "ClashArena — Daily Esports Tournaments" },
      {
        property: "og:description",
        content:
          "Compete in daily esports tournaments, climb the leaderboard and win real prizes.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Gamepad2,
    title: "Daily matches",
    body: "Solo, Duo and Squad brackets across BGMI, Free Fire, Valorant and COD — new lobbies every few hours.",
  },
  {
    icon: ShieldCheck,
    title: "Secure room unlock",
    body: "Room ID and password reveal only to registered players, 15 minutes before the match goes live.",
  },
  {
    icon: Trophy,
    title: "Live leaderboards",
    body: "Kills, placement and points update the moment results are posted. Top three earn podium status.",
  },
  {
    icon: Wallet,
    title: "Wallet built in",
    body: "Separate deposit and winnings balances, transparent history, and quick withdrawal requests.",
  },
];

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <span className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground">
              CA
            </span>
            <span className="font-display text-lg font-bold">ClashArena</span>
          </span>
          <Link
            to={user ? "/home" : "/auth"}
            className="ml-auto rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {user ? "Open app" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden arena-grid">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/25 blur-[110px] float-slow" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-gold/15 blur-[120px] float-slow" />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" /> New lobbies every hour
          </span>
          <h1 className="mt-6 font-display text-4xl font-black leading-tight sm:text-6xl">
            Enter the <span className="text-gradient-primary">arena.</span>
            <br />
            Walk out with the <span className="text-gradient-gold">trophy.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            ClashArena runs competitive mobile and PC esports tournaments with real prize pools,
            protected room credentials and instant payouts to your wallet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={user ? "/home" : "/auth"}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground glow-primary"
            >
              Start competing <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/leaderboard"
              className="rounded-xl border border-border bg-surface-2 px-6 py-3 font-semibold"
            >
              View leaderboard
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-3">
            {[
              ["50K+", "Matches hosted"],
              ["₹1.2Cr", "Prizes paid"],
              ["24/7", "Support"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl glass p-4">
                <p className="font-display text-2xl font-bold text-gradient-gold">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-center font-display text-3xl font-bold">Built for serious players</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl glass p-6 transition-all hover:border-primary/50 hover:glow-primary"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ClashArena. Play responsibly. 18+ only.</p>
      </footer>
    </div>
  );
}
