// Platform analytics (specs.md §8a.4f, Phase 10): Super Admin only. All
// aggregation happens in public.platform_analytics() (0013), which refuses
// any other caller; the role check here just fails fast with a clear message.

import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import type { AcademyAnalyticsRow, AnalyticsWindow, PlatformAnalytics } from "@/types/analytics";

export const WINDOWS: AnalyticsWindow[] = [30, 90, 365];

export function parseWindow(raw: unknown): AnalyticsWindow {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (WINDOWS as number[]).includes(n) ? (n as AnalyticsWindow) : 30;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pct = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const obj = (v: unknown) => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown) => (Array.isArray(v) ? v.map(obj) : []);

// Validate the function's JSON at the boundary: unknown or missing fields
// become 0 / null, never a guess.
export function toPlatformAnalytics(raw: unknown, window: AnalyticsWindow): PlatformAnalytics {
  const r = obj(raw);
  const t = obj(r.totals);
  const a = obj(r.activity);
  return {
    window,
    totals: { academies: num(t.academies), academiesActive: num(t.academiesActive), students: num(t.students), mentors: num(t.mentors), academyAdmins: num(t.academyAdmins), batchesActive: num(t.batchesActive), newUsers: num(t.newUsers) },
    activity: { sessionsHeld: num(a.sessionsHeld), submissions: num(a.submissions), reviews: num(a.reviews), avgScorePct: pct(a.avgScorePct), attendancePct: pct(a.attendancePct), libraryCompletions: num(a.libraryCompletions) },
    academies: arr(r.academies)
      .filter((x) => typeof x.id === "string")
      .map(
        (x): AcademyAnalyticsRow => ({
          id: x.id as string,
          name: typeof x.name === "string" ? x.name : "Academy",
          status: x.status === "suspended" ? "suspended" : "active",
          students: num(x.students),
          mentors: num(x.mentors),
          batches: num(x.batches),
          sessionsHeld: num(x.sessionsHeld),
          submissions: num(x.submissions),
          reviews: num(x.reviews),
          avgScorePct: pct(x.avgScorePct),
          attendancePct: pct(x.attendancePct),
        }),
      ),
    monthly: arr(r.monthly).filter((m) => typeof m.month === "string").map((m) => ({ month: m.month as string, newUsers: num(m.newUsers), submissions: num(m.submissions), reviews: num(m.reviews) })),
    content: arr(r.content).filter((c) => typeof c.category === "string").map((c) => ({ category: c.category as string, published: num(c.published) })),
  };
}

export async function getPlatformAnalytics(window: AnalyticsWindow, nowIso: string): Promise<ServiceResult<PlatformAnalytics>> {
  const me = await getActor();
  if (!me || me.profile.role !== "super_admin") return { ok: false, error: { code: "unauthorized", message: "Only a super admin can view platform analytics." } };
  const since = new Date(Date.parse(nowIso) - window * 86_400_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_analytics", { p_since: since });
  if (error) return mapDbError(error, "We couldn't load analytics. Please try again.");
  return { ok: true, data: toPlatformAnalytics(data, window) };
}
