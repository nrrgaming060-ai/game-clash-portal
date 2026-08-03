import { Link } from "@tanstack/react-router";
import { Flame, Users } from "lucide-react";
import type { Tournament } from "@/lib/types";
import { formatDateTime, inr, tsToDate, useCountdown, pad } from "@/lib/time";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: Tournament["status"] }) {
  if (status === "LIVE")
    return (
      <Badge className="live-dot border-0 bg-destructive text-destructive-foreground">LIVE</Badge>
    );
  if (status === "COMPLETED")
    return <Badge className="border-0 bg-muted text-muted-foreground">COMPLETED</Badge>;
  if (status === "CANCELLED")
    return <Badge className="border-0 bg-destructive/20 text-destructive">CANCELLED</Badge>;
  return <Badge className="border-0 bg-primary/20 text-primary">UPCOMING</Badge>;
}

export function Countdown({ to }: { to: Date | null }) {
  const c = useCountdown(to);
  if (!to) return <span>—</span>;
  if (c.done) return <span className="text-destructive">Started</span>;
  return (
    <span className="tabular-nums">
      {c.days > 0 && `${c.days}d `}
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </span>
  );
}

export function TournamentCard({ t }: { t: Tournament }) {
  const filled = Math.min(100, Math.round(((t.joinedSlots ?? 0) / (t.totalSlots || 1)) * 100));
  return (
    <Link
      to="/tournaments/$id"
      params={{ id: t.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/60 hover:glow-primary"
    >
      <div className="relative h-32 w-full overflow-hidden bg-surface-2">
        {t.bannerUrl ? (
          <img
            src={t.bannerUrl}
            alt={`${t.title} banner`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-primary/10 arena-grid">
            <Flame className="h-8 w-8 text-primary" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={t.status} />
          <Badge className="border-0 bg-background/70 text-foreground">{t.gameName}</Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold leading-tight">{t.title}</h3>
            <p className="text-xs text-muted-foreground">
              {t.category} · {t.map} · {formatDateTime(t.startTime)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase text-muted-foreground">Prize</p>
            <p className="font-display font-bold text-gold">{inr(t.prizePool)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-surface-2 py-1.5">
            <p className="text-muted-foreground">Entry</p>
            <p className="font-semibold text-primary">{inr(t.entryFee)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 py-1.5">
            <p className="text-muted-foreground">Per kill</p>
            <p className="font-semibold">{inr(t.perKill)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 py-1.5">
            <p className="text-muted-foreground">Starts in</p>
            <p className="font-semibold">
              <Countdown to={tsToDate(t.startTime)} />
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {t.joinedSlots ?? 0}/{t.totalSlots} slots
            </span>
            <span>{filled}% full</span>
          </div>
          <Progress value={filled} className="h-1.5" />
        </div>
      </div>
    </Link>
  );
}
