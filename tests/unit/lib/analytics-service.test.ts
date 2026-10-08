// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: db.rpc }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { getPlatformAnalytics, parseWindow, toPlatformAnalytics } from "@/lib/server/analytics/service";

const NOW = "2026-10-08T00:00:00.000Z";
const actor = (role: string) => ({ id: "u", email: null, profile: { id: "u", role, fullName: "A", academyId: null, status: "active" } });

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  db.rpc.mockReset();
});

describe("parseWindow", () => {
  it("accepts only the offered ranges", () => {
    expect(parseWindow("90")).toBe(90);
    expect(parseWindow(["365"])).toBe(365);
    expect(parseWindow("7")).toBe(30);
    expect(parseWindow("abc")).toBe(30);
    expect(parseWindow(undefined)).toBe(30);
  });
});

describe("toPlatformAnalytics — validated at the boundary", () => {
  it("missing or malformed fields become 0 / null, never a guess", () => {
    const a = toPlatformAnalytics({ totals: { students: "12" }, activity: { avgScorePct: null, attendancePct: "x" }, academies: [{ id: "a1", name: "A", status: "weird", avgScorePct: 61.5 }, { name: "no id" }], monthly: [{ month: "2026-10", reviews: 2 }], content: null }, 30);
    expect(a.totals).toMatchObject({ students: 12, mentors: 0, academies: 0 });
    expect(a.activity).toMatchObject({ avgScorePct: null, attendancePct: null, reviews: 0 });
    expect(a.academies).toEqual([{ id: "a1", name: "A", status: "active", students: 0, mentors: 0, batches: 0, sessionsHeld: 0, submissions: 0, reviews: 0, avgScorePct: 61.5, attendancePct: null }]);
    expect(a.monthly).toEqual([{ month: "2026-10", newUsers: 0, submissions: 0, reviews: 2 }]);
    expect(a.content).toEqual([]);
    expect(toPlatformAnalytics(null, 90).academies).toEqual([]);
  });
});

describe("getPlatformAnalytics", () => {
  it("refuses everyone but a super admin before calling the database", async () => {
    for (const role of ["student", "mentor", "academy_admin"]) {
      vi.mocked(getActor).mockResolvedValue(actor(role) as never);
      expect((await getPlatformAnalytics(30, NOW)).error?.code).toBe("unauthorized");
    }
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await getPlatformAnalytics(30, NOW)).error?.code).toBe("unauthorized");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("asks the SQL function for the chosen window", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("super_admin") as never);
    db.rpc.mockResolvedValue({ data: { totals: { academies: 2 } }, error: null });
    const res = await getPlatformAnalytics(90, NOW);
    expect(db.rpc).toHaveBeenCalledWith("platform_analytics", { p_since: "2026-07-10T00:00:00.000Z" });
    expect(res.data?.window).toBe(90);
    expect(res.data?.totals.academies).toBe(2);
  });

  it("maps a permission error to a plain message", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("super_admin") as never);
    db.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not allowed" } });
    const res = await getPlatformAnalytics(30, NOW);
    expect(res.ok).toBe(false);
    expect(res.error?.message).not.toMatch(/42501/);
  });
});
