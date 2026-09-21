// Per-browser only, same rationale/pattern as lib/student/resource-completion.ts:
// this is a placeholder completion store for the 5-Day SSB Practice Journey
// (T039) bank modules. Real, account-scoped completion state replaces this
// once a backend exists for practice content generally (status.md).

const PROGRESS_KEY = "ssb-journey-progress";
const SELF_ASSESSMENT_KEY = "ssb-journey-self-assessment";

function itemKey(dayId: string, moduleId: string, itemId: string): string {
  return `${dayId}:${moduleId}:${itemId}`;
}

export function readCompletedItemKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isItemDone(dayId: string, moduleId: string, itemId: string): boolean {
  return readCompletedItemKeys().includes(itemKey(dayId, moduleId, itemId));
}

export function setItemDone(dayId: string, moduleId: string, itemId: string, done: boolean): string[] {
  const key = itemKey(dayId, moduleId, itemId);
  const current = readCompletedItemKeys();
  const next = done ? Array.from(new Set([...current, key])) : current.filter((k) => k !== key);
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / blocked storage — the action still works for this
    // render, it just won't persist across a refresh.
  }
  return next;
}

export function countDoneForModule(dayId: string, moduleId: string, itemIds: string[]): number {
  const completed = new Set(readCompletedItemKeys());
  return itemIds.filter((id) => completed.has(itemKey(dayId, moduleId, id))).length;
}

export interface JourneyProgressCounts {
  done: number;
  total: number;
}

/** `modules` maps each bank module to its own item id list, so day/overall totals are always the sum of real content, never an invented figure. */
export function getProgressCounts(modules: { dayId: string; moduleId: string; itemIds: string[] }[]): JourneyProgressCounts {
  const completed = new Set(readCompletedItemKeys());
  let done = 0;
  let total = 0;
  for (const m of modules) {
    total += m.itemIds.length;
    for (const itemId of m.itemIds) {
      if (completed.has(itemKey(m.dayId, m.moduleId, itemId))) done += 1;
    }
  }
  return { done, total };
}

export function readSelfAssessment(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SELF_ASSESSMENT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function setSelfAssessmentRating(trait: string, rating: number): Record<string, number> {
  const current = readSelfAssessment();
  const next = { ...current, [trait]: rating };
  try {
    window.localStorage.setItem(SELF_ASSESSMENT_KEY, JSON.stringify(next));
  } catch {
    // Same private-browsing fallback as above.
  }
  return next;
}
