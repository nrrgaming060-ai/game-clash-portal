import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Gift, Home, Menu as MenuIcon, Trophy, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { inr } from "@/lib/time";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/refer", label: "Earn", icon: Gift },
  { to: "/home", label: "Home", icon: Home },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/menu", label: "Menu", icon: MenuIcon },
] as const;

export function AppShell({
  children,
  title,
  showWallet = true,
}: {
  children: ReactNode;
  title?: string;
  showWallet?: boolean;
}) {
  const { profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const balance = (profile?.depositBalance ?? 0) + (profile?.winBalance ?? 0);

  return (
    <div className="min-h-screen bg-background arena-grid">
      <header className="sticky top-0 z-40 glass border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground font-display text-sm font-bold">
              CA
            </span>
            <span className="font-display text-lg font-bold tracking-wide">
              {title ?? "ClashArena"}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {showWallet && (
              <Link
                to="/wallet"
                className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold"
              >
                <Wallet className="h-4 w-4" />
                {inr(balance)}
              </Link>
            )}
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-primary"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 glass border-t border-border/70">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
