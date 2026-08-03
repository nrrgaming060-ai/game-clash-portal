import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { broadcast, watchNotifications } from "@/services/db";
import type { AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Announcements — ClashArena Admin" },
      { name: "description", content: "Broadcast match and offer announcements to all players." },
      { property: "og:title", content: "Announcements — ClashArena Admin" },
      { property: "og:description", content: "Send ClashArena announcements." },
    ],
  }),
  component: AdminNotifications,
});

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80),
  message: z.string().trim().min(5, "Message is too short").max(500),
});

function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [form, setForm] = useState({ title: "", message: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => watchNotifications(setItems), []);

  const send = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      await broadcast({ ...parsed.data, targetAudience: "all" });
      toast.success("Announcement sent");
      setForm({ title: "", message: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-display text-xl font-bold">New announcement</h1>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nt">Title</Label>
            <Input
              id="nt"
              value={form.title}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm">Message</Label>
            <Textarea
              id="nm"
              rows={4}
              value={form.message}
              maxLength={500}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
          <Button className="w-full bg-gradient-primary" disabled={busy} onClick={() => void send()}>
            Send to all players
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Sent</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((n) => (
            <article key={n.id} className="p-3">
              <h3 className="font-medium">{n.title}</h3>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDateTime(n.createdAt)}
              </p>
            </article>
          ))}
          {items.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nothing sent yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
