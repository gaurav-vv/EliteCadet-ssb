// MOCK DATA — isolated per AGENTS.md §8, same rationale as lib/mock/student.ts.
// No real per-mentor academy/assignment scoping exists yet (auth deferred —
// status.md, 2026-09-18): every mentee here is visible to any visitor of
// /mentor. This is tracked as technical debt, closed by T013/T014 + T060.

import type {
  AttentionMentee,
  Evaluation,
  MenteeDetail,
  MenteeProgressRow,
  MenteeSummary,
  MentorDashboardData,
  MentorSession,
  RecentEvaluationRow,
} from "@/types/mentor";

// Display name used only for the demo/sample evaluations and sessions below
// (fictional "Kavita Sharma"). A real mentor's own name comes from their
// Supabase profile (lib/auth/session.ts) everywhere that matters — this
// constant never appears once a real account is involved.
export const MENTOR_NAME = "Kavita Sharma";

// Demo content only — the live arrays below start EMPTY, matching what a
// freshly-created real mentor account should actually see. Populated only
// when the mentor clicks "Load demo data" (lib/actions/mentor.ts), which
// clones this into the live arrays; "Clear demo data" empties them again.
const DEMO_MENTEES: MenteeDetail[] = [
  {
    id: "mentee-1",
    fullName: "Priya Nair",
    batch: "Batch A",
    academyName: "Horizon SSB Academy",
    targetExam: "CDS",
    overallScore: 74,
    weakAreas: ["SRT decisiveness"],
    evaluationStatus: "reviewed",
    lastActivityAt: "2026-09-16T09:00:00.000Z",
    activity: [
      { id: "a1", title: "TAT Set 5", category: "Psychology", completedAt: "2026-09-16T09:00:00.000Z" },
      { id: "a2", title: "WAT Set 7", category: "Psychology", completedAt: "2026-09-13T09:00:00.000Z" },
    ],
    mentorFeedback: [
      { id: "f1", comment: "Strong story structure in TAT — keep resolutions concise.", createdAt: "2026-09-16T10:00:00.000Z" },
    ],
  },
  {
    id: "mentee-2",
    fullName: "Rohit Verma",
    batch: "Batch A",
    academyName: "Horizon SSB Academy",
    targetExam: "AFCAT",
    overallScore: 58,
    weakAreas: ["TAT structure", "WAT speed"],
    evaluationStatus: "pending",
    lastActivityAt: "2026-09-13T09:00:00.000Z",
    activity: [{ id: "a3", title: "TAT Set 3", category: "Psychology", completedAt: "2026-09-13T09:00:00.000Z" }],
    mentorFeedback: [],
  },
  {
    id: "mentee-3",
    fullName: "Sneha Iyer",
    batch: "Batch B",
    academyName: "Horizon SSB Academy",
    targetExam: "CDS",
    overallScore: null,
    weakAreas: [],
    evaluationStatus: "none",
    lastActivityAt: null,
    activity: [],
    mentorFeedback: [],
  },
  {
    id: "mentee-4",
    fullName: "Arjun Mehta",
    batch: "Batch B",
    academyName: "Horizon SSB Academy",
    targetExam: "NDA",
    overallScore: 81,
    weakAreas: [],
    evaluationStatus: "reviewed",
    lastActivityAt: "2026-09-18T07:00:00.000Z",
    activity: [
      { id: "a4", title: "SDT Response", category: "Psychology", completedAt: "2026-09-18T07:00:00.000Z" },
      { id: "a5", title: "SRT Set 4", category: "Psychology", completedAt: "2026-09-15T07:00:00.000Z" },
    ],
    mentorFeedback: [
      { id: "f2", comment: "Consistent, well-paced responses across all four tests.", createdAt: "2026-09-15T08:00:00.000Z" },
    ],
  },
  {
    id: "mentee-5",
    fullName: "Kavya Reddy",
    batch: "Batch A",
    academyName: "Horizon SSB Academy",
    targetExam: "CDS",
    overallScore: 65,
    weakAreas: ["SDT consistency"],
    evaluationStatus: "in_review",
    lastActivityAt: "2026-09-17T09:00:00.000Z",
    activity: [{ id: "a6", title: "SDT Response", category: "Psychology", completedAt: "2026-09-17T09:00:00.000Z" }],
    mentorFeedback: [],
  },
  {
    id: "mentee-6",
    fullName: "Vikram Singh",
    batch: "Batch C",
    academyName: "Horizon SSB Academy",
    targetExam: "SSC",
    overallScore: 49,
    weakAreas: ["Overall consistency"],
    evaluationStatus: "pending",
    lastActivityAt: "2026-09-12T09:00:00.000Z",
    activity: [{ id: "a7", title: "WAT Set 2", category: "Psychology", completedAt: "2026-09-12T09:00:00.000Z" }],
    mentorFeedback: [],
  },
];

function cloneMentees(source: MenteeDetail[]): MenteeDetail[] {
  return source.map((m) => ({
    ...m,
    weakAreas: [...m.weakAreas],
    activity: m.activity.map((a) => ({ ...a })),
    mentorFeedback: m.mentorFeedback.map((f) => ({ ...f })),
  }));
}

export const MENTEES: MenteeDetail[] = [];

// A function, not a precomputed array: MENTEES entries are mutated in place
// by lib/actions/mentor.ts (e.g. evaluationStatus after an evaluation), and
// a one-time .map() would freeze stale copies of those primitive fields.
export function getMenteeSummaries(): MenteeSummary[] {
  return MENTEES.map(({ id, fullName, batch, overallScore, weakAreas, evaluationStatus, lastActivityAt }) => ({
    id,
    fullName,
    batch,
    overallScore,
    weakAreas,
    evaluationStatus,
    lastActivityAt,
  }));
}

export function getMenteeDetail(id: string): MenteeDetail | undefined {
  return MENTEES.find((m) => m.id === id);
}

// Mutable, in-memory, per-server-process — resets on restart. A real backend
// persists this in Postgres once T013/T014 land.
const DEMO_EVALUATIONS: Evaluation[] = [
  {
    id: "eval-1",
    menteeId: "mentee-1",
    menteeName: "Priya Nair",
    activityOrSession: "TAT Set 5",
    score: 74,
    strengths: "Clear, positive story resolutions.",
    improvementAreas: "Vary sentence openings.",
    comments: "Good consistency across the set.",
    status: "reviewed",
    evaluatorName: MENTOR_NAME,
    createdAt: "2026-09-16T10:00:00.000Z",
  },
  {
    id: "eval-2",
    menteeId: "mentee-4",
    menteeName: "Arjun Mehta",
    activityOrSession: "SDT Response",
    score: 81,
    strengths: "Consistent self-description across all five prompts.",
    improvementAreas: "None significant this cycle.",
    comments: "Ready to move to mock interviews.",
    status: "reviewed",
    evaluatorName: MENTOR_NAME,
    createdAt: "2026-09-15T08:00:00.000Z",
  },
  {
    id: "eval-3",
    menteeId: "mentee-5",
    menteeName: "Kavya Reddy",
    activityOrSession: "SDT Response",
    score: 65,
    strengths: "Honest self-assessment.",
    improvementAreas: "Slight inconsistency between father/mother answers.",
    comments: "In review — will confirm after re-reading.",
    status: "in_review",
    evaluatorName: MENTOR_NAME,
    createdAt: "2026-09-17T09:30:00.000Z",
  },
];

const DEMO_SESSIONS: MentorSession[] = [
  {
    id: "session-1",
    title: "Mock Interview Review",
    menteeId: "mentee-1",
    menteeName: "Priya Nair",
    scheduledFor: "2026-09-22T10:30:00.000Z",
    status: "scheduled",
  },
  {
    id: "session-2",
    title: "TAT Strategy Session",
    menteeId: "mentee-2",
    menteeName: "Rohit Verma",
    scheduledFor: "2026-09-12T10:00:00.000Z",
    status: "completed",
  },
];

export const evaluations: Evaluation[] = [];
export const sessions: MentorSession[] = [];

export function resetMentorDemoData(): void {
  MENTEES.splice(0, MENTEES.length, ...cloneMentees(DEMO_MENTEES));
  evaluations.splice(0, evaluations.length, ...DEMO_EVALUATIONS.map((e) => ({ ...e })));
  sessions.splice(0, sessions.length, ...DEMO_SESSIONS.map((s) => ({ ...s })));
}

export function clearMentorDemoData(): void {
  MENTEES.splice(0, MENTEES.length);
  evaluations.splice(0, evaluations.length);
  sessions.splice(0, sessions.length);
}

const ATTENTION: AttentionMentee[] = [
  { menteeId: "mentee-2", fullName: "Rohit Verma", reason: "No practice activity for 5 days." },
  { menteeId: "mentee-6", fullName: "Vikram Singh", reason: "No practice activity for 6 days, and score is trending down." },
  { menteeId: "mentee-3", fullName: "Sneha Iyer", reason: "No practice activity since joining." },
];

const PROGRESS_OVERVIEW: MenteeProgressRow[] = [
  { menteeId: "mentee-1", fullName: "Priya Nair", trend: "up", score: 74 },
  { menteeId: "mentee-2", fullName: "Rohit Verma", trend: "down", score: 58 },
  { menteeId: "mentee-4", fullName: "Arjun Mehta", trend: "flat", score: 81 },
  { menteeId: "mentee-5", fullName: "Kavya Reddy", trend: "up", score: 65 },
  { menteeId: "mentee-6", fullName: "Vikram Singh", trend: "down", score: 49 },
];

// mentorName comes from the real signed-in mentor's profile (lib/api/mentor.ts)
// — everything else is still the shared demo/mock roster (empty until "Load
// demo data" is used). No more "empty"/"active" variant: the real state of
// the MENTEES/evaluations/sessions arrays IS the empty-or-populated switch.
export function getMockDashboardData(mentorName: string): MentorDashboardData {
  const existingIds = new Set(MENTEES.map((m) => m.id));
  const scored = getMenteeSummaries().filter((m) => m.overallScore !== null);
  const averageMenteeScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, m) => sum + (m.overallScore ?? 0), 0) / scored.length)
      : null;

  const recentEvaluations: RecentEvaluationRow[] = evaluations
    .filter((e) => e.status === "reviewed")
    .map((e) => ({ menteeName: e.menteeName, activity: e.activityOrSession, score: e.score, createdAt: e.createdAt }));

  return {
    mentorName,
    totalMentees: getMenteeSummaries().length,
    sessionsThisWeek: sessions.filter((s) => s.status === "scheduled").length,
    pendingEvaluations: getMenteeSummaries().filter((m) => m.evaluationStatus === "pending").length,
    averageMenteeScore,
    todaysSchedule: sessions
      .filter((s) => s.status === "scheduled")
      .map((s) => ({ title: s.title, withName: s.menteeName, scheduledFor: s.scheduledFor })),
    menteeProgressOverview: PROGRESS_OVERVIEW.filter((row) => existingIds.has(row.menteeId)),
    recentEvaluations,
    attentionMentees: ATTENTION.filter((row) => existingIds.has(row.menteeId)),
  };
}
