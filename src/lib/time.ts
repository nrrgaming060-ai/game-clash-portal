import { useEffect, useState } from "react";

/** Accepts an ISO string (Postgres) or anything date-like. */
export function tsToDate(ts?: string | Date | null): Date | null {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(ts?: string | Date | null): string {
  const d = tsToDate(ts);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function inr(n: number | undefined) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

export interface Remaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function useCountdown(target: Date | null): Remaining {
  const calc = (): Remaining => {
    const total = target ? target.getTime() - Date.now() : 0;
    const clamped = Math.max(total, 0);
    return {
      total,
      days: Math.floor(clamped / 86400000),
      hours: Math.floor((clamped / 3600000) % 24),
      minutes: Math.floor((clamped / 60000) % 60),
      seconds: Math.floor((clamped / 1000) % 60),
      done: total <= 0,
    };
  };
  const [state, setState] = useState<Remaining>(() => calc());
  useEffect(() => {
    setState(calc());
    const id = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime()]);
  return state;
}

export const pad = (n: number) => String(n).padStart(2, "0");
