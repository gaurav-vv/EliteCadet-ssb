"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { loadNotificationsAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { NotificationRecord } from "@/types/notifications";

const WHEN = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Badge count comes from the server layout; the list is fetched fresh each
// time the popover opens, so it never shows a stale copy.
export function NotificationBell({ unreadCount, allHref }: { unreadCount: number; allHref: string }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRecord[] | null>(null);
  const [unread, setUnread] = useState(unreadCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      const result = await loadNotificationsAction();
      if (result.ok && result.data) {
        setItems(result.data.items);
        setUnread(result.data.unread);
        setError(null);
      } else setError(result.error?.message ?? "We couldn't load notifications. Please try again.");
    });

  const markAll = () =>
    start(async () => {
      const result = await markNotificationReadAction();
      if (result.ok) {
        setItems((list) => list?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
        setUnread(0);
      } else setError(result.error?.message ?? "We couldn't update notifications. Please try again.");
    });

  const open = (n: NotificationRecord) => {
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      void markNotificationReadAction(n.id);
    }
    if (n.href) router.push(n.href);
  };

  const shown = unread > 99 ? "99+" : String(unread);

  return (
    <Popover onOpenChange={(isOpen) => isOpen && load()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex size-11 items-center justify-center rounded-pill text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink"
        >
          <Bell aria-hidden="true" size={19} />
          {unread > 0 && (
            <span aria-hidden="true" className="absolute top-1.5 right-1 min-w-[18px] rounded-pill bg-brand-accent px-1 text-center text-[11px] leading-[18px] font-semibold text-white">
              {shown}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-card border border-hairline bg-white p-0 shadow-md">
        <PopoverHeader className="flex flex-row items-center justify-between border-b border-hairline px-4 py-3">
          <PopoverTitle>Notifications</PopoverTitle>
          {unread > 0 && (
            <button type="button" onClick={markAll} disabled={pending} className="min-h-11 text-[13px] text-brand-accent hover:underline disabled:opacity-60">
              Mark all read
            </button>
          )}
        </PopoverHeader>
        <div className="max-h-96 overflow-y-auto" aria-live="polite" aria-busy={pending && items === null}>
          {error ? (
            <p role="alert" className="px-4 py-6 text-[13px] text-danger">{error}</p>
          ) : items === null ? (
            <p className="px-4 py-6 text-[13px] text-ink-secondary">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState title="You're all caught up" description="Sessions, assessments and feedback show up here." />
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => open(n)} className="row-hover-tint flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left">
                    <span aria-hidden="true" className={n.readAt ? "mt-1.5 size-2 shrink-0" : "mt-1.5 size-2 shrink-0 rounded-full bg-brand-accent"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-ink">
                        {n.title}
                        {!n.readAt && <span className="sr-only"> (unread)</span>}
                      </span>
                      {n.body && <span className="block truncate text-[13px] text-ink-secondary">{n.body}</span>}
                      <span className="block text-[12px] text-ink-secondary">{WHEN.format(new Date(n.createdAt))}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-hairline px-4 py-2">
          <Link href={allHref} className="inline-flex min-h-11 items-center text-[13px] text-brand-accent hover:underline">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
