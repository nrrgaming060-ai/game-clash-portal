import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ListSkeleton } from "@/components/States";
import { watchNotifications } from "@/services/db";
import type { AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — ClashArena" },
      {
        name: "description",
        content: "Match announcements, result updates and offers from the ClashArena team.",
      },
      { property: "og:title", content: "Notifications — ClashArena" },
      { property: "og:description", content: "Latest ClashArena announcements." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  ),
});

function Notifications() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  useEffect(() => watchNotifications(setItems), []);

  return (
    <AppShell title="Notifications">
      {items === null ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Match alerts and announcements will show up here."
          icon={<Bell className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <article key={n.id} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display font-semibold">{n.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {formatDateTime(n.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
