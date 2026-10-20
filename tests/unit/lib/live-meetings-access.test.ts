// @vitest-environment node
// Role permissions and academy scope for live meetings (T094) at the service
// layer. The database repeats every rule; those checks run under real RLS in
// supabase/tests/workflow-check.sql (section 10).
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), queue: [] as unknown[], eqCalls: [] as [string, unknown][] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from, rpc: db.rpc }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn() }));
vi.mock("@/lib/server/meetings/livekit", () => ({
  liveKitConfig: vi.fn(() => ({ url: "wss://lk.test", apiKey: "k", apiSecret: "s" })),
  createJoinToken: vi.fn(async () => "token"),
  ensureRoom: vi.fn(async () => undefined),
  closeRoom: vi.fn(async () => undefined),
  setPublishLevel: vi.fn(async () => undefined),
  muteAudio: vi.fn(async () => undefined),
  removeFromRoom: vi.fn(async () => undefined),
}));

import { getActor } from "@/lib/server/auth/guard";
import * as livekit from "@/lib/server/meetings/livekit";
import * as meetings from "@/lib/server/meetings/service";
import * as sessions from "@/lib/server/sessions/service";

const ACADEMY = "aaaaaaaa-0000-4000-8000-00000000000a";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const MENTOR = "22222222-2222-4222-8222-222222222222";
const OTHER_MENTOR = "33333333-3333-4333-8333-333333333333";
const STUDENT = "44444444-4444-4444-8444-444444444444";
const BATCH = "55555555-5555-4555-8555-555555555555";
const MEETING = "66666666-6666-4666-8666-666666666666";

type Role = "mentor" | "student" | "academy_admin" | "super_admin";
const actor = (role: Role, id = ADMIN, academyId: string | null = ACADEMY) => ({ id, email: null, profile: { id, role, fullName: "Person", academyId, status: "active" as const } });

function meetingRow(over: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + 5 * 60_000).toISOString();
  const end = new Date(Date.now() + 65 * 60_000).toISOString();
  return {
    id: MEETING, batch_id: BATCH, mentor_id: MENTOR, title: "Batch call", description: null, starts_at: start, ends_at: end, mode: "online",
    meeting_url: null, location: null, for_whole_batch: true, status: "scheduled", cancel_reason: null, meeting_kind: "batch",
    actual_started_at: null, actual_ended_at: null, ended_early: false, session_participants: [], ...over,
  };
}

function builder() {
  const result = db.queue.shift() ?? { data: null, error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "upsert", "neq", "in", "lt", "gte", "order", "limit", "not"]) q[m] = vi.fn(() => q);
  q.eq = vi.fn((col: string, val: unknown) => {
    db.eqCalls.push([col, val]);
    return q;
  });
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(livekit.createJoinToken).mockClear();
  vi.mocked(livekit.setPublishLevel).mockClear();
  db.queue = [];
  db.eqCalls = [];
  db.from.mockReset();
  db.from.mockImplementation(() => builder());
  db.rpc.mockReset();
  db.rpc.mockResolvedValue({ data: null, error: null });
});

describe("who may open a meeting", () => {
  it("never lets a super admin in (they don't join meetings)", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("super_admin"));
    expect((await meetings.getMeetingView(MEETING)).error?.code).toBe("not_found");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("scopes an academy admin's lookup to their own academy", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    db.queue.push({ data: null, error: null }); // RLS + academy filter: another academy's meeting isn't returned
    expect((await meetings.getMeetingView(MEETING)).error?.code).toBe("not_found");
    expect(db.eqCalls).toContainEqual(["academy_id", ACADEMY]);
  });

  it("hides another mentor's meeting from a mentor", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor", OTHER_MENTOR));
    db.queue.push({ data: meetingRow(), error: null });
    expect((await meetings.getMeetingView(MEETING)).error?.code).toBe("not_found");
  });

  it("keeps a student waiting until a host starts the meeting", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student", STUDENT));
    db.queue.push({ data: meetingRow(), error: null });
    expect((await meetings.getMeetingView(MEETING)).data?.join).toBe("waiting_for_mentor");
    vi.mocked(getActor).mockResolvedValue(actor("student", STUDENT));
    db.queue.push({ data: meetingRow(), error: null });
    const join = await meetings.joinMeeting(MEETING);
    expect(join.ok).toBe(false);
    expect(livekit.createJoinToken).not.toHaveBeenCalled();
  });

  it("refuses a student the host removed", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student", STUDENT));
    db.queue.push({ data: meetingRow({ actual_started_at: new Date().toISOString() }), error: null }, { data: { user_id: STUDENT }, error: null });
    expect((await meetings.getMeetingView(MEETING)).data?.join).toBe("removed");
  });
});

describe("hosts", () => {
  it("lets an academy admin start the meeting as co-host with a host token", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    db.queue.push({ data: meetingRow(), error: null });
    const res = await meetings.joinMeeting(MEETING);
    expect(res.ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("start_live_meeting", { p_session: MEETING });
    expect(livekit.createJoinToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: ADMIN, role: "admin", kind: "batch" }));
  });

  it("gives a student a student token for exactly their identity", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student", STUDENT));
    db.queue.push({ data: meetingRow({ actual_started_at: new Date().toISOString() }), error: null }, { data: null, error: null });
    const res = await meetings.joinMeeting(MEETING);
    expect(res.ok).toBe(true);
    expect(db.rpc).not.toHaveBeenCalledWith("start_live_meeting", expect.anything());
    expect(livekit.createJoinToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: STUDENT, role: "student" }));
  });

  it("refuses end and moderation to students", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student", STUDENT));
    expect((await meetings.endMeeting(MEETING)).error?.code).toBe("unauthorized");
    expect((await meetings.moderateParticipant(MEETING, STUDENT, "allow_audio")).error?.code).toBe("unauthorized");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("lets an academy admin moderate a live meeting in their academy, only for its students", async () => {
    const live = meetingRow({ actual_started_at: new Date().toISOString() });
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    db.queue.push({ data: live, error: null }, { data: { student_id: STUDENT }, error: null });
    expect((await meetings.moderateParticipant(MEETING, STUDENT, "allow_audio")).ok).toBe(true);
    expect(livekit.setPublishLevel).toHaveBeenCalledWith(expect.anything(), MEETING, STUDENT, "batch", "audio");

    db.queue.push({ data: live, error: null }, { data: null, error: null });
    expect((await meetings.moderateParticipant(MEETING, OTHER_MENTOR, "remove")).error?.code).toBe("not_found");
  });
});

describe("academy admin scheduling", () => {
  const input = { batchId: BATCH, mentorId: MENTOR, title: "Batch call", description: "", date: "2026-12-01", startTime: "10:00", endTime: "11:00", forWholeBatch: true, studentId: "" };
  const NOW = "2026-10-20T00:00:00.000Z";
  const formRows = () => {
    db.queue.push(
      { data: [{ id: BATCH, name: "Alpha", mentors: [{ id: MENTOR, name: "Mentor" }] }], error: null }, // batch_overview
      { data: [{ id: STUDENT, full_name: "Student", batch_id: BATCH }], error: null }, // academy_students
    );
  };

  it("is refused to mentors and students (they have their own path or none)", async () => {
    for (const role of ["mentor", "student"] as const) {
      vi.mocked(getActor).mockResolvedValue(actor(role));
      expect((await sessions.scheduleAcademyMeeting(input, NOW)).error?.code).toBe("unauthorized");
    }
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("only offers the admin's own academy's batches", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    formRows();
    await sessions.getAcademyScheduleFormData();
    expect(db.eqCalls.filter(([c]) => c === "academy_id")).toEqual([["academy_id", ACADEMY], ["academy_id", ACADEMY]]);
  });

  it("refuses a batch outside the academy and a host who doesn't teach the batch", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    formRows();
    expect((await sessions.scheduleAcademyMeeting({ ...input, batchId: MEETING }, NOW)).fieldErrors).toMatchObject({ batchId: expect.any(String) });
    formRows();
    expect((await sessions.scheduleAcademyMeeting({ ...input, mentorId: OTHER_MENTOR }, NOW)).fieldErrors).toMatchObject({ mentorId: expect.any(String) });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("schedules through admin_schedule_live_meeting with the host mentor", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    formRows();
    db.rpc.mockResolvedValue({ data: MEETING, error: null });
    expect(await sessions.scheduleAcademyMeeting(input, NOW)).toMatchObject({ ok: true, data: { id: MEETING } });
    expect(db.rpc).toHaveBeenCalledWith("admin_schedule_live_meeting", expect.objectContaining({ p_kind: "batch", p_batch: BATCH, p_mentor: MENTOR, p_student: null }));
  });

  it("explains the host mentor's daily limit in plain words", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    formRows();
    db.rpc.mockResolvedValue({ data: null, error: { code: "MT001", details: "day=2026-12-01;used=90;limit=120" } });
    const res = await sessions.scheduleAcademyMeeting(input, NOW);
    expect(res.error?.message).toMatch(/already have 90 minutes .* 30 minutes are left/);
  });

  it("cancels only live meetings that haven't started, in the admin's academy", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin"));
    db.queue.push({ data: meetingRow({ meeting_kind: null, meeting_url: "https://x.test" }), error: null });
    expect((await sessions.cancelAcademyMeeting(MEETING, "Room clash")).ok).toBe(false);
    db.queue.push({ data: meetingRow({ actual_started_at: new Date().toISOString() }), error: null });
    expect((await sessions.cancelAcademyMeeting(MEETING, "Room clash")).error?.message).toMatch(/has started/);
    db.queue.push({ data: meetingRow(), error: null });
    expect((await sessions.cancelAcademyMeeting(MEETING, "Room clash")).ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("cancel_live_meeting", { p_session: MEETING, p_reason: "Room clash" });
    expect(db.eqCalls).toContainEqual(["academy_id", ACADEMY]);
  });
});
