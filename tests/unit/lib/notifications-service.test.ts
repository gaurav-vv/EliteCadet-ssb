// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[], calls: [] as { table: string; q: Record<string, ReturnType<typeof vi.fn>> }[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { getMyNotifications, getMyUnreadCount, markRead, safeHref, toNotification } from "@/lib/server/notifications/service";

const ME = "11111111-1111-4111-8111-111111111111";
const N1 = "22222222-2222-4222-8222-222222222222";
const actor = { id: ME, email: null, profile: { id: ME, role: "student" as const, fullName: "S", academyId: "a", status: "active" as const } };
const row = (over: Record<string, unknown> = {}) => ({ id: N1, kind: "session_scheduled", title: "New session scheduled", body: "GD", href: "/student/sessions", read_at: null, created_at: "2026-10-08T00:00:00Z", ...over });

function builder(table: string) {
  const result = db.queue.shift() ?? { data: [], error: null, count: 0 };
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "update", "eq", "is", "order", "limit"]) q[m] = vi.fn(() => q);
  (q as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  db.calls.push({ table, q });
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  db.queue = [];
  db.calls = [];
  db.from.mockReset();
  db.from.mockImplementation((t: string) => builder(t));
});

describe("boundary validation", () => {
  it("only same-site paths are followable", () => {
    expect(safeHref("/student/sessions")).toBe("/student/sessions");
    expect(safeHref("/student/assessments/2b4c")).toBe("/student/assessments/2b4c");
    expect(safeHref("https://evil.example")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref(null)).toBeNull();
  });

  it("drops rows with an unknown kind or missing fields", () => {
    expect(toNotification(row())).toMatchObject({ id: N1, kind: "session_scheduled", readAt: null });
    expect(toNotification(row({ kind: "something_else" }))).toBeNull();
    expect(toNotification(row({ title: undefined }))).toBeNull();
    expect(toNotification(row({ href: "https://x.example" }))?.href).toBeNull();
  });
});

describe("own notifications only", () => {
  it("signed-out callers get nothing and touch no table", async () => {
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await getMyNotifications()).error?.code).toBe("unauthorized");
    expect(await getMyUnreadCount()).toBe(0);
    expect((await markRead()).error?.code).toBe("unauthorized");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("lists the caller's rows newest first with the unread count", async () => {
    vi.mocked(getActor).mockResolvedValue(actor as never);
    db.queue.push({ data: [row(), row({ id: "x", kind: "bogus" })], error: null }, { data: null, error: null, count: 3 });
    const res = await getMyNotifications();
    expect(res.data).toEqual({ items: [expect.objectContaining({ id: N1 })], unread: 3 });
    for (const c of db.calls) expect(c.q.eq).toHaveBeenCalledWith("recipient_id", ME);
    expect(db.calls[0].q.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("marks one (by id) or all unread, always scoped to the caller", async () => {
    vi.mocked(getActor).mockResolvedValue(actor as never);
    expect((await markRead("not-a-uuid")).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();

    expect((await markRead(N1)).ok).toBe(true);
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("recipient_id", ME);
    expect(db.calls[0].q.eq).toHaveBeenCalledWith("id", N1);
    expect(db.calls[0].q.is).toHaveBeenCalledWith("read_at", null);

    expect((await markRead()).ok).toBe(true);
    expect(db.calls[1].q.eq).not.toHaveBeenCalledWith("id", expect.anything());
  });

  it("never leaks a raw database error", async () => {
    vi.mocked(getActor).mockResolvedValue(actor as never);
    db.queue.push({ data: null, error: { code: "XX000", message: "relation notifications does not exist" } }, { data: null, error: null, count: 0 });
    const res = await getMyNotifications();
    expect(res.error?.message).not.toMatch(/relation/);
  });
});
