// Pure roadmap rules (tests/unit/lib/roadmap-compute.test.ts). Deterministic
// and explainable (PRD §5.3); the learner keeps control — the stage is a
// suggestion, shown next to the stage they reported themselves (PRD §13.3).

import type { DiagnosticOverview } from "@/types/diagnostic";
import type { JourneyMission } from "@/types/practice";
import type { Recommendation } from "@/types/progress";
import type { ReadinessDimension, ReadinessDimensionId, ReadinessProfile } from "@/types/readiness";
import type { Roadmap, RoadmapAction, RoadmapFocus, RoadmapStageId } from "@/types/roadmap";
import { PREPARATION_STAGES, type StudentPreferences } from "@/types/student";

const STAGES: Record<RoadmapStageId, { label: string; explanation: string }> = {
  exploration: { label: "Exploration", explanation: "Take the starting-point diagnostic so your plan can fit you." },
  foundation: { label: "Foundation", explanation: "Build evidence across the main areas: practise each at least once." },
  core_preparation: { label: "Core preparation", explanation: "Work steadily on your weaker areas while keeping the others going." },
  advanced_practice: { label: "Advanced practice", explanation: "Several areas are strong; push the rest and practise under time." },
  mock_readiness: { label: "Mock readiness", explanation: "Your interview and psychology practice are strong: run full mock interviews and timed tests." },
  final_revision: { label: "Final revision", explanation: "Your SSB date is close: revise, rest well and run short timed practice." },
};

const ACTIONS: Record<ReadinessDimensionId, { title: string; href: string }> = {
  communication: { title: "Do an AI interview, focusing on clear, specific answers", href: "/student/practice/interview/ai" },
  self_awareness: { title: "Write a Self Description practice", href: "/student/practice/psychology/sdt" },
  interview: { title: "Do a guided AI interview", href: "/student/practice/interview/ai" },
  psychology: { title: "Take a timed psychology test (TAT, WAT or SRT)", href: "/student/practice/psychology" },
  gto: { title: "Work through the GTO days of the journey", href: "/student/practice/day-3" },
  revision: { title: "Retake a test you've had feedback on", href: "/student/practice/psychology" },
  consistency: { title: "Do a short practice today", href: "/student/practice" },
};

const CORE: ReadinessDimensionId[] = ["psychology", "interview", "communication", "self_awareness"];
const DAY_MS = 86_400_000;

export function daysUntil(dateIso: string | null, nowIso: string): number | null {
  if (!dateIso) return null;
  const today = Date.parse(`${new Date(Date.parse(nowIso) + 5.5 * 3_600_000).toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((Date.parse(`${dateIso}T00:00:00Z`) - today) / DAY_MS);
}

export function stageFor(hasBaseline: boolean, daysToTarget: number | null, dims: ReadinessDimension[]): RoadmapStageId {
  if (!hasBaseline) return "exploration";
  if (daysToTarget !== null && daysToTarget >= 0 && daysToTarget <= 21) return "final_revision";
  const evidenced = dims.filter((d) => d.state !== "not_enough_evidence").length;
  const strong = dims.filter((d) => d.state === "strong");
  if (evidenced < 3) return "foundation";
  if (strong.length >= 5 && strong.some((d) => d.id === "interview") && strong.some((d) => d.id === "psychology")) return "mock_readiness";
  if (strong.length >= 3) return "advanced_practice";
  return "core_preparation";
}

// Weakest first; unpractised core areas count as weak. GTO without evidence is
// left out until GTO practice exists.
export function focusAreas(dims: ReadinessDimension[]): RoadmapFocus[] {
  const rank = (d: ReadinessDimension) =>
    d.state === "needs_attention" ? 0 : d.state === "not_enough_evidence" ? (CORE.includes(d.id) ? 1 : 9) : d.state === "developing" ? 2 : d.state === "improving" ? 3 : 9;
  return dims
    .filter((d) => rank(d) < 9)
    .sort((a, b) => rank(a) - rank(b) || DIMENSION_PRIORITY.indexOf(a.id) - DIMENSION_PRIORITY.indexOf(b.id))
    .slice(0, 3)
    .map((d) => ({
      dimension: d.id,
      name: d.name,
      state: d.state,
      why: d.state === "not_enough_evidence" ? "Not practised enough yet to know where you stand." : (d.evidence[0] ?? `Currently ${d.state.replace("_", " ")}.`),
      action: { ...ACTIONS[d.id], reason: d.state === "not_enough_evidence" ? `${d.name} has no evidence yet.` : `${d.name} is ${d.state === "needs_attention" ? "your weakest area" : d.state.replace("_", " ")}.` },
    }));
}

const DIMENSION_PRIORITY: ReadinessDimensionId[] = ["psychology", "interview", "communication", "self_awareness", "consistency", "revision", "gto"];

export function weekPlan(minutes: number, focus: RoadmapFocus[]): { label: string; minutes: number }[] {
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
  if (focus.length === 0) return [{ label: "Practice journey", minutes }];
  const shares = [[1], [0.6, 0.4], [0.5, 0.3, 0.2]][focus.length - 1];
  return focus.map((f, i) => ({ label: f.name, minutes: round5(minutes * shares[i]) }));
}

export interface RoadmapInputs {
  preferences: StudentPreferences;
  diagnostic: DiagnosticOverview;
  readiness: ReadinessProfile | null;
  recommendations: Recommendation[];
  mission: JourneyMission;
  nowIso: string;
}

export function buildRoadmap({ preferences, diagnostic, readiness, recommendations, mission, nowIso }: RoadmapInputs): Roadmap {
  const dims = readiness?.dimensions ?? [];
  const daysToTarget = daysUntil(preferences.targetSsbDate, nowIso);
  const hasBaseline = diagnostic.baseline !== null;
  const stageId = stageFor(hasBaseline, daysToTarget, dims);
  const focus = hasBaseline ? focusAreas(dims) : [];

  // Daily Mission: a short ranked list, each with its reason (FR-DASH-01).
  const candidates: RoadmapAction[] = [];
  if (!preferences.onboarded) candidates.push({ title: "Set up your preparation", reason: "Tell us your entry, target date and daily time so the plan fits you.", href: "/onboarding" });
  if (!hasBaseline) candidates.push({ title: "Take the starting-point diagnostic", reason: "About 15 minutes. It sets your starting point so your plan fits you — it isn't a test you can fail.", href: "/student/diagnostic" });
  if (recommendations[0]) candidates.push({ title: recommendations[0].title, reason: recommendations[0].reason, href: recommendations[0].href });
  if (stageId === "final_revision") candidates.push({ title: "Run a mock interview", reason: `Your SSB date is ${daysToTarget === 0 ? "today" : `in ${daysToTarget} days`}; timed practice matters most now.`, href: "/student/practice/interview/ai" });
  if (focus[0]) candidates.push({ title: focus[0].action.title, reason: focus[0].action.reason, href: focus[0].action.href });
  const consistency = dims.find((d) => d.id === "consistency");
  if (consistency && (consistency.state === "needs_attention" || consistency.state === "developing")) candidates.push({ title: "Practise for a few minutes today", reason: consistency.evidence[0] ?? "Regular practice builds the habit.", href: "/student/practice" });
  if (mission && mission !== "all-done") candidates.push({ title: `Continue Day ${mission.dayNumber}: ${mission.title}`, reason: `${mission.done} of ${mission.total} done in this practice set.`, href: mission.href });
  const baselineAge = diagnostic.baseline ? Date.parse(nowIso) - Date.parse(diagnostic.baseline.submittedAt) : 0;
  if (hasBaseline && !diagnostic.latest && baselineAge > 28 * DAY_MS && diagnostic.nextAllowedAt === null) candidates.push({ title: "Retake the diagnostic", reason: "It's been over four weeks: see how far you've come since your starting point.", href: "/student/diagnostic" });
  const seen = new Set<string>();
  const today = candidates.filter((c) => (seen.has(c.href) ? false : (seen.add(c.href), true))).slice(0, 3);

  const basedOn = [
    hasBaseline ? "your starting-point diagnostic" : null,
    diagnostic.latest ? "your latest re-assessment" : null,
    dims.some((d) => d.state !== "not_enough_evidence") ? "your readiness profile" : null,
    preferences.targetSsbDate ? "your target SSB date" : null,
    preferences.dailyStudyMinutes ? "the time you have each day" : null,
  ].filter((x): x is string => x !== null);

  return {
    stage: { id: stageId, ...STAGES[stageId] },
    selfReportedStage: preferences.preparationStage ? PREPARATION_STAGES[preferences.preparationStage] : null,
    daysToTarget,
    focus,
    weekPlan: hasBaseline ? weekPlan(preferences.dailyStudyMinutes ?? 30, focus) : [],
    today,
    basedOn,
  };
}
