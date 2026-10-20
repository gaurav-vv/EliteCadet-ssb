// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), queue: [] as unknown[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import * as service from "@/lib/server/sessions/service";

const ME = "11111111-1111-4111-8111-111111111111";
const BATCH = "22222222-2222-4222-8222-222222222222";
const OTHER_BATCH = "33333333-3333-4333-8333-333333333333";
const STUDENT = "44444444-4444-4444-8444-444444444444";
const SESSION = "55555555-5555-4555-8555-555555555555";
const NOW = "2026-10-08T00:00:00.000Z";
const actor = (role: "mentor" | "student" | "academy_admin") => ({ id: ME, email: null, profile: { id: ME, role, fullName: "M", academyId: "acad", status: "active" as const } });
const input = { batchId: BATCH, title: "GD practice", description: "", date: "2026-10-15", startTime: "18:30", endTime: "20:00", mode: "online", meetingUrl: "https://meet.example.com/x", location: "", forWholeBatch: true, participantIds: [] };

// Every from() returns a chainable builder whose await resolves to the next queued result.
function builder() {
  const result = db.queue.shift() ?? { data: [], error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "in", "lt", "gte", "order", "limit"]) q[m] = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(findMyBatchIds).mockReset();
  db.queue = [];
  db.from.mockReset();
  db.from.mockImplementation(() => builder());
});

function teaches(...ids: string[]) {
  vi.mocked(findMyBatchIds).mockResolvedValue({ data: ids.map((id) => ({ id, name: "Batch" })), error: null });
}

describe("role scope", () => {
  it("refuses non-mentors for mentor operations, and non-students for the student view", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student"));
    expect((await service.scheduleSession(input, NOW)).error?.code).toBe("unauthorized");
    expect((await service.getMySessions("upcoming", NOW)).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("mentor"));
    expect((await service.getMyStudentSessions("upcoming", NOW)).error?.code).toBe("unauthorized");
    expect(db.from).not.toHaveBeenCalled();
  });
});

describe("scheduleSession", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));

  it("refuses a batch the mentor doesn't teach", async () => {
    teaches(OTHER_BATCH);
    db.queue.push({ data: [], error: null }, { data: [], error: null }); // students, availability
    const res = await service.scheduleSession(input, NOW);
    expect(res.fieldErrors).toMatchObject({ batchId: expect.any(String) });
  });

  it("refuses selected students who aren't in the batch", async () => {
    teaches(BATCH);
    db.queue.push({ data: [], error: null }, { data: [], error: null });
    const res = await service.scheduleSession({ ...input, forWholeBatch: false, participantIds: [STUDENT] }, NOW);
    expect(res.fieldErrors).toMatchObject({ participantIds: expect.any(String) });
  });

  it("explains a double-booking (exclusion violation 23P01)", async () => {
    teaches(BATCH);
    db.queue.push({ data: [], error: null }, { data: [], error: null }, { data: null, error: { code: "23P01" } });
    expect((await service.scheduleSession(input, NOW)).error?.message).toMatch(/overlaps another session/);
  });

  it("schedules for the mentor's batch, flagging when it's outside availability", async () => {
    teaches(BATCH);
    db.queue.push(
      { data: [{ id: STUDENT, full_name: "Asha", batch_id: BATCH }], error: null },
      { data: [{ id: "slot", weekday: 1, start_time: "09:00:00", end_time: "10:00:00" }], error: null },
      { data: { id: SESSION }, error: null },
      { data: null, error: null }, // clear participants
    );
    const res = await service.scheduleSession(input, NOW);
    expect(res).toMatchObject({ ok: true, data: { id: SESSION }, outsideAvailability: true });
  });
});

describe("cancel / complete", () => {
  const row = (over: Record<string, unknown> = {}) => ({ id: SESSION, batch_id: BATCH, mentor_id: ME, title: "GD", starts_at: "2026-10-15T13:00:00.000Z", ends_at: "2026-10-15T14:30:00.000Z", mode: "online", status: "scheduled", ...over });
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));

  it("needs a reason to cancel", async () => {
    db.queue.push({ data: row(), error: null });
    expect((await service.cancelSession(SESSION, "no")).error?.code).toBe("validation_error");
  });

  it("can't complete a session that hasn't started", async () => {
    db.queue.push({ data: row(), error: null });
    expect((await service.completeSession(SESSION, NOW)).error?.message).toMatch(/once it has started/);
  });

  it("treats someone else's session as not found", async () => {
    db.queue.push({ data: null, error: null });
    expect((await service.cancelSession(SESSION, "Unwell today")).error?.code).toBe("not_found");
  });
});
