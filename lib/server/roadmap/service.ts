// Roadmap service (T105): gathers the inputs and applies compute.ts. Each
// input fails soft (an empty value), so one slow source never blocks the plan.

import { getMyDiagnosticOverview } from "@/lib/server/diagnostic/service";
import { getMyJourneyProgress } from "@/lib/server/practice/journey-progress";
import { getMyProgress } from "@/lib/server/progress/service";
import { getMyReadiness } from "@/lib/server/readiness/service";
import { buildRoadmap } from "@/lib/server/roadmap/compute";
import { getMyPreferences } from "@/lib/server/student/preferences";
import type { ServiceResult } from "@/lib/server/users/service";
import type { Roadmap } from "@/types/roadmap";

export async function getMyRoadmap(nowIso: string): Promise<ServiceResult<Roadmap>> {
  const [preferences, diagnostic, readiness, progress, journey] = await Promise.all([getMyPreferences(), getMyDiagnosticOverview(nowIso), getMyReadiness(nowIso), getMyProgress(nowIso), getMyJourneyProgress()]);
  if (!preferences.ok || !preferences.data) return preferences as ServiceResult<never>;
  if (!diagnostic.ok || !diagnostic.data) return diagnostic as ServiceResult<never>;
  return {
    ok: true,
    data: buildRoadmap({
      preferences: preferences.data,
      diagnostic: diagnostic.data,
      readiness: readiness.ok ? (readiness.data ?? null) : null,
      recommendations: progress.ok ? (progress.data?.recommendations ?? []) : [],
      mission: journey.ok ? (journey.data?.mission ?? null) : null,
      nowIso,
    }),
  };
}
