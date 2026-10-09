// Journey progress: the journey's structure (lib/practice/journey.ts) joined
// with the student's saved answers (0014). Only self-paced banks count —
// a timed test is one submission, not per-question progress.

import { getPracticeBankModules, SSB_DAYS } from "@/lib/practice/journey";
import { getMyBankProgress } from "@/lib/server/practice/service";
import type { ServiceResult } from "@/lib/server/users/service";
import type { BankProgress, JourneyDayProgress, JourneyMission } from "@/types/practice";

export type { JourneyDayProgress, JourneyMission };

export interface JourneyProgress {
  bySlug: Record<string, BankProgress>;
  overall: BankProgress;
  days: JourneyDayProgress[];
  mission: JourneyMission;
}

export function practiceSlugs(): string[] {
  return getPracticeBankModules().map((m) => m.bank.slug);
}

// Pure (tests/unit/lib/practice-journey.test.ts).
export function buildJourneyProgress(bySlug: Record<string, BankProgress>): JourneyProgress {
  const modules = getPracticeBankModules();
  const of = (slug: string) => bySlug[slug] ?? { done: 0, total: 0 };
  const days = SSB_DAYS.map((d) => {
    const mine = modules.filter((m) => m.dayId === d.id).map((m) => of(m.bank.slug));
    return { dayId: d.id, dayNumber: d.dayNumber, title: d.title, done: mine.reduce((s, p) => s + p.done, 0), total: mine.reduce((s, p) => s + p.total, 0) };
  });
  const overall = { done: days.reduce((s, d) => s + d.done, 0), total: days.reduce((s, d) => s + d.total, 0) };
  const dayNumber = new Map(SSB_DAYS.map((d) => [d.id, d.dayNumber]));
  const withItems = modules.filter((m) => of(m.bank.slug).total > 0);
  const next = withItems.find((m) => of(m.bank.slug).done < of(m.bank.slug).total);
  const mission: JourneyMission = next
    ? { dayNumber: dayNumber.get(next.dayId) ?? 0, title: next.title, href: next.href ?? `/student/practice/${next.dayId}/${next.id}`, ...of(next.bank.slug) }
    : withItems.length > 0
      ? "all-done"
      : null;
  return { bySlug, overall, days, mission };
}

export async function getMyJourneyProgress(): Promise<ServiceResult<JourneyProgress>> {
  const result = await getMyBankProgress(practiceSlugs());
  if (!result.ok || !result.data) return result as ServiceResult<never>;
  return { ok: true, data: buildJourneyProgress(result.data) };
}
