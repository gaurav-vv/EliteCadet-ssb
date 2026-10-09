// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn(), authorize: vi.fn(), isGuardFailure: (v: object) => "ok" in v }));
vi.mock("@/lib/server/users/repository", () => ({ insertAudit: vi.fn().mockResolvedValue({ data: null, error: null }) }));

import { authorize, getActor } from "@/lib/server/auth/guard";
import * as requests from "@/lib/server/content/requests";

const ME = "11111111-1111-4111-8111-111111111111";
const R = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const mentor = { id: ME, email: null, profile: { id: ME, role: "mentor" as const, fullName: "M", academyId: "acad", status: "active" as const } };
const superActor = { ...mentor, profile: { ...mentor.profile, role: "super_admin" as const } };
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "no" } };

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "order", "limit"]) q[m] = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(authorize).mockReset();
  db.rpc.mockReset();
  db.from.mockReset();
});

describe("mentor side", () => {
  it("only mentors can request; the request is created as theirs, in their academy", async () => {
    vi.mocked(getActor).mockResolvedValue({ ...mentor, profile: { ...mentor.profile, role: "student" as const } });
    expect((await requests.createRequest({}, "2026-10-08")).error?.code).toBe("unauthorized");

    vi.mocked(getActor).mockResolvedValue(mentor);
    const q = chain({ data: { id: R }, error: null });
    db.from.mockReturnValue(q);
    const res = await requests.createRequest({ title: "SRT set", details: "Twenty situations please.", category: "psychology", type: "practice_exercise" }, "2026-10-08");
    expect(res).toEqual({ ok: true, data: { id: R } });
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ mentor_id: ME, academy_id: "acad", title: "SRT set" }));
  });

  it("accept/decline/cancel go through the lifecycle functions; a wrong state is explained", async () => {
    vi.mocked(getActor).mockResolvedValue(mentor);
    db.rpc.mockResolvedValue({ error: null });
    expect((await requests.respondToQuote(R, true)).ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("respond_to_content_quote", { p_request: R, p_accept: true });
    db.rpc.mockResolvedValue({ error: { code: "P0002" } });
    expect((await requests.cancelRequest(R)).error?.message).toMatch(/can no longer be cancelled/);
  });
});

describe("super admin side", () => {
  it("staff actions refuse non-super-admins before any database call", async () => {
    vi.mocked(authorize).mockResolvedValue(denied);
    for (const call of [() => requests.quoteRequest(R, "1500", ""), () => requests.startRequest(R), () => requests.deliverRequest(R, C), () => requests.markSettled(R), () => requests.getAllRequests("all")]) {
      expect((await call()).error?.code).toBe("unauthorized");
    }
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid fee without touching the database", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    expect((await requests.quoteRequest(R, "-5", "")).error?.code).toBe("validation_error");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("delivers through the database function", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    db.rpc.mockResolvedValue({ data: C, error: null });
    expect(await requests.deliverRequest(R, C)).toEqual({ ok: true, data: { contentId: C } });
    expect(db.rpc).toHaveBeenCalledWith("deliver_content_request", { p_request: R, p_content: C });
  });

  it("marks settled only when a fee is owed", async () => {
    vi.mocked(authorize).mockResolvedValue(superActor);
    const q = chain({ data: [], error: null });
    db.from.mockReturnValue(q);
    expect((await requests.markSettled(R)).error?.message).toMatch(/owed/);
    expect(q.eq).toHaveBeenCalledWith("settlement", "owed");
  });
});

describe("toRequest", () => {
  it("drops malformed rows and reads embedded names and the fee", () => {
    expect(requests.toRequest(null)).toBeNull();
    expect(requests.toRequest({ id: R, mentor_id: ME, title: "x", created_at: "t", category: "nope", type: "video", status: "requested" })).toBeNull();
    const r = requests.toRequest({ id: R, mentor_id: ME, title: "SRT", details: "d", created_at: "t", category: "psychology", type: "video", status: "quoted", quoted_fee_inr: "1500.50", settlement: "not_due", mentor: { full_name: "Kavi" }, academy: [{ name: "Alpha" }] });
    expect(r).toMatchObject({ mentorName: "Kavi", academyName: "Alpha", quotedFeeInr: 1500.5, status: "quoted" });
  });
});
