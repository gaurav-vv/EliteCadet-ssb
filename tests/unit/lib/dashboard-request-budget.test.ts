// @vitest-environment node
// Request budget for one student dashboard load, using the REAL dashboard and
// progress services against a fake Supabase client that counts every call and gives
// each one a fixed latency. It measures two things that differ:
//  * how many Supabase calls a load makes (and that no dataset is read twice), and
//  * the critical path: the number of calls that must run one after another,
//    derived from wall time / per-call latency. Fewer calls do not help if the
//    longest chain stays the same.
// Fake data is empty, so reads that only happen when data exists (for example the
// Library suggestion for a weak area) are not exercised here.
import { describe, expect, it, vi } from "vitest";

const CALL_MS = 30;
const calls = vi.hoisted(() => ({ list: [] as string[] }));
const ME = "11111111-1111-4111-8111-111111111111";

function chain(label: string) {
  const empty = { data: label === "rpc:readiness_signals" ? {} : [], error: null, count: 0, status: 200 };
  const proxy: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (res: (v: unknown) => unknown) => new Promise((r) => setTimeout(r, CALL_MS)).then(() => empty).then(res);
      if (prop === "maybeSingle" || prop === "single") return () => new Promise((r) => setTimeout(r, CALL_MS)).then(() => ({ ...empty, data: null }));
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (t: string) => (calls.list.push(`from:${t}`), chain(`from:${t}`)),
    rpc: (n: string) => (calls.list.push(`rpc:${n}`), chain(`rpc:${n}`)),
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUserAndProfile: async () => ({ user: { id: ME, email: null }, profile: { id: ME, role: "student", fullName: "Asha", academyId: null, status: "active" }, profileError: false }),
}));

import { getStudentDashboard } from "@/lib/server/dashboards/service";

describe("student dashboard request budget", () => {
  it("reads each dataset once and keeps the longest dependent chain short", async () => {
    const started = performance.now();
    const res = await getStudentDashboard("2026-10-08T06:00:00.000Z");
    const elapsed = performance.now() - started;
    expect(res.ok).toBe(true);

    const count = (target: string) => calls.list.filter((c) => c === target).length;
    // The dashboard and getMyProgress share one assessments read and one sessions read.
    expect(count("from:assessments")).toBe(1);
    expect(count("from:assessment_attempts")).toBe(1);
    expect(count("from:sessions")).toBe(1);
    expect(count("from:student_progress")).toBe(1);
    expect(count("from:student_scores")).toBe(1);
    // Before: 15 calls. After: 12.
    expect(calls.list.length).toBeLessThanOrEqual(12);

    // Critical path in round trips. Measured with this harness: about 3.4 to 4.1 before the
    // dashboard change and about 1.6 to 1.8 after it (3 runs each). The bound sits between
    // the two, so it fails if the old sequential chain comes back.
    const chainLength = elapsed / CALL_MS;
    expect(chainLength).toBeLessThan(2.8);
  });
});
