import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="shimmer rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-32 w-full rounded-xl bg-muted" />
      <Skeleton className="mt-3 h-5 w-2/3 bg-muted" />
      <Skeleton className="mt-2 h-4 w-1/3 bg-muted" />
      <Skeleton className="mt-4 h-2 w-full bg-muted" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="shimmer rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-1/2 bg-muted" />
          <Skeleton className="mt-2 h-3 w-1/3 bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-primary opacity-80">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
