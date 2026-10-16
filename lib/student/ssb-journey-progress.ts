// Per-browser only, by design: the Day 5 self-assessment ("No one else sees
// this; it's stored on this device only"). Journey progress itself is saved
// to the student's account (practice_answers, 0014).

const SELF_ASSESSMENT_KEY = "ssb-journey-self-assessment";

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
