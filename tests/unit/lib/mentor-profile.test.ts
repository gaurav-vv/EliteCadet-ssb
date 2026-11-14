// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Chainable fake of the supabase query builder; each test sets the final results.
const db = vi.hoisted(() => {
  const calls: { table: string; op: string; payload?: unknown; filters: [string, unknown][] }[] = [];
  const results: Record<string, { data: unknown; error: unknown }> = {};
  const from = (table: string) => {
    const call = { table, op: "select", payload: undefined as unknown, filters: [] as [string, unknown][] };
    calls.push(call);
    const builder: Record<string, unknown> = {
      select: () => builder,
      update: (p: unknown) => ((call.op = "update"), (call.payload = p), builder),
      eq: (c: string, v: unknown) => (call.filters.push([c, v]), builder),
      maybeSingle: async () => results[`${table}:${call.op}`],
      then: (res: (v: unknown) => unknown) => Promise.resolve(results[`${table}:${call.op}`]).then(res),
    };
    return builder;
  };
  return { calls, results, from };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { getMyMentorProfile, saveMentorProfile, validateMentorProfile } from "@/lib/server/mentor/profile";

const actor = (role: string) => ({ id: "m1", email: null, profile: { id: "m1", role, fullName: "Asha Verma", academyId: "a1", status: "active" } });

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  db.calls.length = 0;
  for (const k of Object.keys(db.results)) delete db.results[k];
});

describe("mentor profile validation", () => {
  it("trims, de-duplicates and splits expertise", () => {
    expect(validateMentorProfile({ fullName: "  Asha Verma ", bio: " Ex-GTO ", expertise: "TAT,  tat , Interview,, GTO  tasks" })).toEqual({
      ok: true,
      value: { fullName: "Asha Verma", bio: "Ex-GTO", expertise: ["TAT", "Interview", "GTO tasks"] },
    });
  });
  it("allows an empty bio and no expertise", () => {
    expect(validateMentorProfile({ fullName: "Asha", bio: "", expertise: "" })).toMatchObject({ ok: true, value: { bio: "", expertise: [] } });
  });
  it("explains every problem", () => {
    const r = validateMentorProfile({ fullName: "A", bio: "b".repeat(601), expertise: Array.from({ length: 9 }, (_, i) => `area${i}`).join(",") });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["bio", "expertise", "fullName"]);
    expect(validateMentorProfile({ fullName: "Asha", expertise: "x".repeat(41) }).ok).toBe(false);
  });
});

describe("mentor profile service", () => {
  it("refuses anyone who isn't a signed-in mentor", async () => {
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await getMyMentorProfile()).ok).toBe(false);
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    const r = await saveMentorProfile({ fullName: "Asha Verma", bio: "", expertise: "" });
    expect(r).toMatchObject({ ok: false, error: { code: "unauthorized" } });
    expect(db.calls).toHaveLength(0);
  });

  it("loads the saved bio and expertise, never invented defaults", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    db.results["mentor_profiles:select"] = { data: null, error: null };
    expect(await getMyMentorProfile()).toEqual({ ok: true, data: { fullName: "Asha Verma", bio: "", expertise: [] } });
    db.results["mentor_profiles:select"] = { data: { bio: "Ex-GTO", expertise: ["TAT"] }, error: null };
    expect(await getMyMentorProfile()).toMatchObject({ data: { bio: "Ex-GTO", expertise: ["TAT"] } });
  });

  it("saves only the mentor's own row, and the name only when it changed", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    db.results["mentor_profiles:update"] = { data: [{ user_id: "m1" }], error: null };
    const r = await saveMentorProfile({ fullName: "Asha Verma", bio: "Ex-GTO", expertise: "TAT" });
    expect(r.ok).toBe(true);
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0]).toMatchObject({ table: "mentor_profiles", op: "update", payload: { bio: "Ex-GTO", expertise: ["TAT"] }, filters: [["user_id", "m1"]] });

    db.calls.length = 0;
    db.results["profiles:update"] = { data: null, error: null };
    await saveMentorProfile({ fullName: "Asha V", bio: "", expertise: "" });
    expect(db.calls.map((c) => c.table)).toEqual(["mentor_profiles", "profiles"]);
    expect(db.calls[0].payload).toMatchObject({ bio: null, expertise: [] });
  });

  it("reports failure when RLS updated nothing", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    db.results["mentor_profiles:update"] = { data: [], error: null };
    expect(await saveMentorProfile({ fullName: "Asha Verma", bio: "", expertise: "" })).toMatchObject({ ok: false, error: { code: "server_error" } });
  });

  it("returns field errors without touching the database", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    const r = await saveMentorProfile({ fullName: "", bio: "", expertise: "" });
    expect(r).toMatchObject({ ok: false, error: { code: "validation_error" }, fieldErrors: { fullName: expect.any(String) } });
    expect(db.calls).toHaveLength(0);
  });
});
