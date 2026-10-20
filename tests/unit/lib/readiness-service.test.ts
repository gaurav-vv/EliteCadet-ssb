// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: db.rpc }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { getMyReadiness, getStudentReadiness } from "@/lib/server/readiness/service";

const ME = "11111111-1111-4111-8111-111111111111";
const STU = "22222222-2222-4222-8222-222222222222";
const actor = (role: string) => ({ id: ME, email: null, profile: { id: ME, role, fullName: "A", academyId: "a", status: "active" } });
const signals = { mentor: [{ category: "psychology", n: 2, avg_pct: 50 }], ai: [], practice: {}, attendance: {}, active_days_28: 3, active_days_7: 1, account_created_at: "2026-09-01T00:00:00Z" };

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  db.rpc.mockReset().mockResolvedValue({ data: signals, error: null });
});

describe("readiness service", () => {
  it("a student reads their own profile", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    const r = await getMyReadiness("2026-10-19T00:00:00Z");
    expect(db.rpc).toHaveBeenCalledWith("readiness_signals", { p_student: ME });
    expect(r.data?.dimensions.find((d) => d.id === "psychology")?.next).toBeTruthy();
  });

  it("academy admins get states only; mentors get evidence", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("academy_admin") as never);
    const a = await getStudentReadiness(STU, "2026-10-19T00:00:00Z");
    expect(a.data?.dimensions.every((d) => d.evidence.length === 0)).toBe(true);
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    const m = await getStudentReadiness(STU, "2026-10-19T00:00:00Z");
    expect(m.data?.dimensions.find((d) => d.id === "psychology")?.evidence.length).toBeGreaterThan(0);
  });

  it("a refusal from the database (not their student) is 'not found'; students can't read others", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "not allowed" } });
    expect((await getStudentReadiness(STU, "t")).error?.code).toBe("not_found");
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    expect((await getStudentReadiness(STU, "t")).error?.code).toBe("unauthorized");
    expect((await getStudentReadiness("bad", "t")).error?.code).toBe("unauthorized");
  });
});
