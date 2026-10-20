"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import type { NotificationRecord } from "@/types/notifications";

const WHEN = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function NotificationList({ initial }: { initial: NotificationRecord[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.readAt).length;

  const markAll = () =>
    start(async () => {
      const result = await markNotificationReadAction();
      if (result.ok) {
        setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
        setError(null);
        router.refresh();
      } else setError(result.error?.message ?? "We couldn't update notifications. Please try again.");
    });

  const open = (n: NotificationRecord) => {
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      void markNotificationReadAction(n.id);
    }
    if (n.href) router.push(n.href);
  };

  if (items.length === 0) {
    return (
      <div className="glass-regular rounded-card">
        <EmptyState icon={<Bell aria-hidden="true" size={22} />} title="You're all caught up" description="Sessions, assessments, feedback and batch changes show up here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-secondary" aria-live="polite">{unread === 0 ? "All read" : `${unread} unread`}</p>
        {unread > 0 && <Button type="button" variant="outline" onClick={markAll} disabled={pending} className="min-h-11">Mark all read</Button>}
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <ul className="glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => open(n)} className="row-hover-tint flex min-h-14 w-full items-start gap-3 px-5 py-4 text-left">
              <span aria-hidden="true" className={n.readAt ? "mt-1.5 size-2 shrink-0" : "mt-1.5 size-2 shrink-0 rounded-full bg-brand-accent"} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">
                  {n.title}
                  {!n.readAt && <span className="sr-only"> (unread)</span>}
                </span>
                {n.body && <span className="block text-[13px] text-ink-secondary">{n.body}</span>}
              </span>
              <span className="shrink-0 text-[12px] text-ink-secondary">{WHEN.format(new Date(n.createdAt))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
