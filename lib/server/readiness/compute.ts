// Pure readiness rules (tests/unit/lib/readiness-compute.test.ts). Fixed,
// explainable thresholds — no AI decides a state (PRD §5.3). A mentor's
// reviews outweigh AI practice feedback when both exist (PRD §12.12).

import type { ReadinessConfidence, ReadinessDimension, ReadinessDimensionId, ReadinessProfile, ReadinessSignals, ReadinessState } from "@/types/readiness";

type Level = "strong" | "developing" | "needs_attention";

// Which AI rubric dimensions count as evidence for which readiness dimension.
const AI_MAP: { rubric: RegExp; dimension?: RegExp; to: ReadinessDimensionId }[] = [
  { rubric: /^psychology-/, to: "psychology" },
  { rubric: /^psychology-sdt$/, dimension: /^(balance|growth)$/, to: "self_awareness" },
  { rubric: /^interview$/, dimension: /^(relevance|consistency)$/, to: "interview" },
  { rubric: /^interview$/, dimension: /^(specificity|structure)$/, to: "communication" },
  { rubric: /^interview$/, dimension: /^reflection$/, to: "self_awareness" },
  { rubric: /^general-response$/, to: "communication" },
];

// Mentor review categories (assessments) per readiness dimension.
const MENTOR_MAP: Partial<Record<ReadinessDimensionId, string>> = { psychology: "psychology", interview: "interview", communication: "communication", gto: "gto" };

const NAMES: Record<ReadinessDimensionId, string> = {
  communication: "Communication",
  self_awareness: "Self-awareness",
  interview: "Interview",
  psychology: "Psychology",
  gto: "GTO",
  revision: "Revision",
  consistency: "Consistency",
};

export const DIMENSION_ORDER: ReadinessDimensionId[] = ["communication", "self_awareness", "interview", "psychology", "gto", "revision", "consistency"];

const RATING_VALUE: Record<Level, number> = { needs_attention: 0, developing: 1, strong: 2 };
const CONF_WEIGHT = { low: 0.5, medium: 1, high: 1.5 } as const;

export const levelFromPct = (pct: number): Level => (pct >= 70 ? "strong" : pct >= 45 ? "developing" : "needs_attention");
export const levelFromAiAverage = (avg: number): Level => (avg >= 1.4 ? "strong" : avg >= 0.67 ? "developing" : "needs_attention");

function aiRowsFor(id: ReadinessDimensionId, s: ReadinessSignals) {
  return s.ai.filter((r) => AI_MAP.some((m) => m.to === id && m.rubric.test(r.rubricId) && (!m.dimension || m.dimension.test(r.dimension))));
}

function weightedAvg(rows: ReadinessSignals["ai"]): number | null {
  let sum = 0;
  let weight = 0;
  for (const r of rows) {
    const w = CONF_WEIGHT[r.confidence] * r.n;
    sum += RATING_VALUE[r.rating] * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : null;
}

function confidenceFor(items: number, mentorReviews: number, aiOnlyLow: boolean): ReadinessConfidence {
  if (items >= 10 && mentorReviews >= 2) return "high";
  if (items >= 4 && !aiOnlyLow) return "medium";
  return "low";
}

const PLURAL = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function skillDimension(id: ReadinessDimensionId, s: ReadinessSignals, practiceNote: string | null): ReadinessDimension {
  const category = MENTOR_MAP[id];
  const mentor = category ? s.mentor.find((m) => m.category === category) : undefined;
  const ai = aiRowsFor(id, s);
  const aiCount = ai.reduce((n, r) => n + r.n, 0);
  const mentorCount = mentor?.n ?? 0;
  const evidence: string[] = [];
  if (mentor && mentor.avgPct !== null) {
    evidence.push(`${PLURAL(mentorCount, "mentor review")} averaging ${Math.round(mentor.avgPct)}%${mentor.recentAvg !== null && mentor.previousAvg !== null ? ` (latest three ${Math.round(mentor.recentAvg)}%, the three before ${Math.round(mentor.previousAvg)}%)` : ""}`);
  }
  if (aiCount > 0) {
    const by = (lvl: Level) => ai.filter((r) => r.rating === lvl).reduce((n, r) => n + r.n, 0);
    evidence.push(`AI practice feedback: ${by("strong")} strong, ${by("developing")} developing and ${by("needs_attention")} needs-attention patterns`);
  }
  if (practiceNote) evidence.push(practiceNote);

  const items = mentorCount + aiCount;
  if (items < 2) {
    return { id, name: NAMES[id], state: "not_enough_evidence", confidence: "low", evidence, next: nextFor(id, "not_enough_evidence") };
  }

  // A mentor's judgement leads once there are two reviews.
  const aiAvg = weightedAvg(ai);
  const level: Level = mentorCount >= 2 && mentor?.avgPct != null ? levelFromPct(mentor.avgPct) : aiAvg !== null ? levelFromAiAverage(aiAvg) : levelFromPct(mentor!.avgPct ?? 0);

  // Improving: below strong, but the most recent evidence is clearly better.
  const mentorTrend = mentor?.recentAvg != null && mentor?.previousAvg != null ? mentor.recentAvg - mentor.previousAvg : null;
  const recentAi = weightedAvg(ai.filter((r) => r.recent));
  const olderAi = weightedAvg(ai.filter((r) => !r.recent));
  const aiTrend = recentAi !== null && olderAi !== null ? recentAi - olderAi : null;
  const improving = level !== "strong" && ((mentorTrend !== null && mentorTrend >= 8) || (mentorTrend === null && aiTrend !== null && aiTrend >= 0.5));
  const state: ReadinessState = improving ? "improving" : level;
  const confidence = confidenceFor(items, mentorCount, mentorCount === 0 && ai.every((r) => r.confidence === "low"));
  return { id, name: NAMES[id], state, confidence, evidence, next: nextFor(id, state) };
}

function consistency(s: ReadinessSignals, now: number): ReadinessDimension {
  const ageDays = s.accountCreatedAt ? (now - Date.parse(s.accountCreatedAt)) / 86_400_000 : 0;
  const evidence = [`Active on ${PLURAL(s.activeDays28, "day")} in the last 4 weeks (${s.activeDays7} in the last week)`];
  let state: ReadinessState;
  if (s.activeDays28 >= 12) state = "strong";
  else if (s.activeDays28 === 0) state = ageDays >= 14 ? "needs_attention" : "not_enough_evidence";
  else if (s.activeDays7 >= 4) state = "improving";
  else state = s.activeDays28 >= 6 ? "developing" : "needs_attention";
  // Measured directly, so confidence depends only on how long there is to measure.
  const confidence: ReadinessConfidence = ageDays >= 28 ? "high" : ageDays >= 14 ? "medium" : "low";
  return { id: "consistency", name: NAMES.consistency, state, confidence, evidence, next: nextFor("consistency", state) };
}

function revision(s: ReadinessSignals): ReadinessDimension {
  const { repeatsAfterFeedback28d: repeats } = s.practice;
  const hadFeedback = s.ai.length > 0 || s.mentor.length > 0;
  const evidence = [`${PLURAL(repeats, "test")} retaken after feedback and ${PLURAL(s.library28d, "Library item")} read in the last 4 weeks`];
  let state: ReadinessState;
  if (!hadFeedback && repeats === 0 && s.library28d === 0) state = "not_enough_evidence";
  else if (repeats >= 2 && s.library28d >= 3) state = "strong";
  else if (repeats >= 1 || s.library28d >= 1) state = "developing";
  else state = "needs_attention";
  const items = repeats + s.library28d;
  return { id: "revision", name: NAMES.revision, state, confidence: items >= 6 ? "high" : items >= 2 ? "medium" : "low", evidence, next: nextFor("revision", state) };
}

const NEXT: Record<ReadinessDimensionId, string> = {
  communication: "Do an AI interview and focus on leading with your point, then one concrete example.",
  self_awareness: "Write a Self Description practice, giving each weaker area what you are doing about it.",
  interview: "Take a guided AI interview and answer every follow-up with a real example.",
  psychology: "Take a timed TAT, WAT or SRT practice and read the pattern feedback afterwards.",
  gto: "Read the GTO tasks in the Day 3 and Day 4 journey and ask your mentor for a GTO assessment.",
  revision: "Retake a test you've had feedback on, and read one Library item on that area.",
  consistency: "Practise a little every day — even one question keeps the habit going.",
};

function nextFor(id: ReadinessDimensionId, state: ReadinessState): string | null {
  return state === "strong" ? null : NEXT[id];
}

/** `audience: "academy"` keeps states and confidence but drops evidence and next steps. */
export function buildReadiness(s: ReadinessSignals, nowIso: string, audience: "student" | "mentor" | "academy" = "student"): ReadinessProfile {
  const now = Date.parse(nowIso);
  const practice = s.practice.tests28d + s.practice.done28d > 0 ? `${PLURAL(s.practice.done28d, "practice question")} done and ${PLURAL(s.practice.tests28d, "timed test")} in the last 4 weeks` : null;
  const interviews = s.practice.interviews28d > 0 ? `${PLURAL(s.practice.interviews28d, "AI interview")} in the last 4 weeks` : null;
  const byId: Record<ReadinessDimensionId, ReadinessDimension> = {
    communication: skillDimension("communication", s, null),
    self_awareness: skillDimension("self_awareness", s, null),
    interview: skillDimension("interview", s, interviews),
    psychology: skillDimension("psychology", s, practice),
    gto: skillDimension("gto", s, null),
    revision: revision(s),
    consistency: consistency(s, now),
  };
  const dimensions = DIMENSION_ORDER.map((id) => (audience === "academy" ? { ...byId[id], evidence: [], next: null } : audience === "mentor" ? { ...byId[id], next: null } : byId[id]));
  return { dimensions, generatedAt: nowIso };
}

// Validate the function's JSON at the boundary.
export function toSignals(raw: unknown): ReadinessSignals {
  const o = (v: unknown) => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const n = (v: unknown) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : 0);
  const num = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
  const r = o(raw);
  const p = o(r.practice);
  const a = o(r.attendance);
  const LEVELS = ["strong", "developing", "needs_attention"];
  const CONF = ["low", "medium", "high"];
  return {
    accountCreatedAt: typeof r.account_created_at === "string" ? r.account_created_at : null,
    mentor: (Array.isArray(r.mentor) ? r.mentor : []).map(o).filter((m) => typeof m.category === "string").map((m) => ({ category: m.category as string, n: n(m.n), avgPct: num(m.avg_pct), recentAvg: num(m.recent_avg), previousAvg: num(m.previous_avg) })),
    ai: (Array.isArray(r.ai) ? r.ai : [])
      .map(o)
      .filter((x) => typeof x.rubric_id === "string" && typeof x.dimension === "string" && LEVELS.includes(x.rating as string) && CONF.includes(x.confidence as string))
      .map((x) => ({ rubricId: x.rubric_id as string, dimension: x.dimension as string, rating: x.rating as Level, confidence: x.confidence as ReadinessConfidence, recent: x.recent === true, n: n(x.n) })),
    practice: { done28d: n(p.done_28d), tests28d: n(p.tests_28d), interviews28d: n(p.interviews_28d), repeatsAfterFeedback28d: n(p.repeats_after_feedback_28d) },
    library28d: n(r.library_28d),
    attendance: { present: n(a.present), absent: n(a.absent) },
    activeDays28: n(r.active_days_28),
    activeDays7: n(r.active_days_7),
  };
}
