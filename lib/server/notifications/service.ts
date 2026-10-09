// In-app notifications (specs.md §8a.4f, Phase 10). Rows are written only by
// database triggers (0013); this module reads the caller's own and marks them
// read. RLS limits every query to recipient_id = auth.uid(); the explicit
// filter below keeps the intent visible and the query indexed.

import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { NotificationFeed, NotificationKind, NotificationRecord } from "@/types/notifications";

const KINDS: NotificationKind[] = ["session_scheduled", "session_cancelled", "assessment_published", "submission_received", "feedback_reviewed", "batch_assigned", "content_request_new", "content_request_update"];
const COLUMNS = "id, kind, title, body, href, read_at, created_at";
export const FEED_LIMIT = 10;
export const PAGE_LIMIT = 100;

const fail = <T>(code: "unauthorized" | "not_found", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

// Only same-site paths are ever followed (the DB check enforces it too).
export function safeHref(href: unknown): string | null {
  return typeof href === "string" && /^\/[a-z][a-z0-9/_-]*$/i.test(href) && !href.startsWith("//") ? href : null;
}

export function toNotification(row: unknown): NotificationRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.created_at !== "string") return null;
  if (!KINDS.includes(r.kind as NotificationKind)) return null;
  return {
    id: r.id,
    kind: r.kind as NotificationKind,
    title: r.title,
    body: typeof r.body === "string" && r.body ? r.body : null,
    href: safeHref(r.href),
    readAt: typeof r.read_at === "string" ? r.read_at : null,
    createdAt: r.created_at,
  };
}

export async function getMyNotifications(limit = FEED_LIMIT): Promise<ServiceResult<NotificationFeed>> {
  const me = await getActor();
  if (!me) return fail("unauthorized", "Please sign in again.");
  const supabase = await createClient();
  const [list, unread] = await Promise.all([
    supabase.from("notifications").select(COLUMNS).eq("recipient_id", me.id).order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), PAGE_LIMIT)),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", me.id).is("read_at", null),
  ]);
  const failed = list.error ?? unread.error;
  if (failed) return mapDbError(failed, "We couldn't load notifications. Please try again.");
  return { ok: true, data: { items: (list.data ?? []).map(toNotification).filter((n): n is NotificationRecord => n !== null), unread: unread.count ?? 0 } };
}

export async function getMyUnreadCount(): Promise<number> {
  const me = await getActor();
  if (!me) return 0;
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", me.id).is("read_at", null);
  return count ?? 0;
}

// One id, or every unread one when `id` is omitted. Idempotent.
export async function markRead(id?: string): Promise<ServiceResult<null>> {
  const me = await getActor();
  if (!me) return fail("unauthorized", "Please sign in again.");
  if (id !== undefined && !isUuid(id)) return fail("not_found", "That notification isn't available.");
  const supabase = await createClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", me.id).is("read_at", null);
  if (id) query = query.eq("id", id);
  const { error } = await query;
  if (error) return mapDbError(error, "We couldn't update notifications. Please try again.");
  return { ok: true, data: null };
}
