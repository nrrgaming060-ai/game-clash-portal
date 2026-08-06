import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, Image, QrCode, Swords, Trophy, Users, Wallet } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => (
    <RequireAuth admin>
      <AdminLayout />
    </RequireAuth>
  ),
});

const NAV = [
  { to: "/admin", label: "Overview", icon: BarChart3 },
  { to: "/admin/tournaments", label: "Tournaments", icon: Swords },
  { to: "/admin/results", label: "Results", icon: Trophy },
  { to: "/admin/requests", label: "Wallet", icon: Wallet },
  { to: "/admin/payments", label: "Payments", icon: QrCode },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/notifications", label: "Notices", icon: Bell },
  { to: "/admin/advertisements", label: "Ads", icon: Image },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background arena-grid">
      <header className="sticky top-0 z-40 glass border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-background">
              CA
            </span>
            <span className="font-display text-lg font-bold">Admin Console</span>
          </Link>
          <Link
            to="/home"
            className="ml-auto rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-sm"
          >
            Exit to app
          </Link>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                  active
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border bg-surface-2 text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
