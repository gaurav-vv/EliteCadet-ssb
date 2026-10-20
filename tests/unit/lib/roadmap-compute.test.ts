// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildReadiness } from "@/lib/server/readiness/compute";
import { buildRoadmap, daysUntil, focusAreas, stageFor, weekPlan, type RoadmapInputs } from "@/lib/server/roadmap/compute";
import type { DiagnosticOverview, DiagnosticSummary } from "@/types/diagnostic";
import type { ReadinessDimension, ReadinessSignals } from "@/types/readiness";
import type { StudentPreferences } from "@/types/student";

const NOW = "2026-10-19T06:00:00Z";
const prefs = (over: Partial<StudentPreferences> = {}): StudentPreferences => ({ fullName: "S", entryScheme: "cds", targetSsbDate: null, preparationStage: "in_progress", preferredLanguage: "en", dailyStudyMinutes: 60, goals: "", onboarded: true, ...over });
const summary = (submittedAt = "2026-10-01T00:00:00Z"): DiagnosticSummary => ({ id: "d1", kind: "baseline", submittedAt, knowledge: { correct: 3, total: 4 }, reasoning: { correct: 2, total: 4 }, written: {} });
const diag = (over: Partial<DiagnosticOverview> = {}): DiagnosticOverview => ({ baseline: summary(), latest: null, nextAllowedAt: null, ...over });
const signals = (over: Partial<ReadinessSignals> = {}): ReadinessSignals => ({ accountCreatedAt: "2026-09-01T00:00:00Z", mentor: [], ai: [], practice: { done28d: 0, tests28d: 0, interviews28d: 0, repeatsAfterFeedback28d: 0 }, library28d: 0, attendance: { present: 0, absent: 0 }, activeDays28: 8, activeDays7: 2, ...over });
const dims = (states: Partial<Record<ReadinessDimension["id"], ReadinessDimension["state"]>>) =>
  buildReadiness(signals(), NOW).dimensions.map((d) => ({ ...d, state: states[d.id] ?? "not_enough_evidence", evidence: [`evidence for ${d.id}`] }));

describe("stage", () => {
  it("starts at exploration until the diagnostic is done", () => {
    expect(stageFor(false, null, dims({ psychology: "strong" }))).toBe("exploration");
  });
  it("moves through foundation, core, advanced and mock readiness with evidence", () => {
    expect(stageFor(true, null, dims({ psychology: "developing" }))).toBe("foundation");
    expect(stageFor(true, null, dims({ psychology: "developing", interview: "developing", communication: "needs_attention" }))).toBe("core_preparation");
    expect(stageFor(true, null, dims({ psychology: "strong", interview: "strong", communication: "strong", consistency: "developing" }))).toBe("advanced_practice");
    expect(stageFor(true, null, dims({ psychology: "strong", interview: "strong", communication: "strong", self_awareness: "strong", consistency: "strong" }))).toBe("mock_readiness");
  });
  it("switches to final revision within three weeks of the SSB date", () => {
    expect(stageFor(true, 21, dims({}))).toBe("final_revision");
    expect(stageFor(true, 22, dims({}))).toBe("foundation");
  });
  it("counts days to the target in IST", () => {
    expect(daysUntil("2026-10-19", "2026-10-18T19:00:00Z")).toBe(0); // 00:30 IST on the 19th
    expect(daysUntil("2026-11-02", NOW)).toBe(14);
    expect(daysUntil(null, NOW)).toBeNull();
  });
});

describe("focus and time", () => {
  it("focuses on the weakest areas first, unpractised core areas next, never GTO without evidence", () => {
    const f = focusAreas(dims({ psychology: "developing", interview: "needs_attention", consistency: "strong", revision: "improving" }));
    expect(f.map((x) => x.dimension)).toEqual(["interview", "communication", "self_awareness"]);
    expect(f[0].why).toBe("evidence for interview");
    expect(f[1].why).toMatch(/Not practised enough/);
    expect(focusAreas(dims({})).some((x) => x.dimension === "gto")).toBe(false);
  });
  it("splits daily time across the focus areas", () => {
    const f = focusAreas(dims({ psychology: "needs_attention", interview: "developing", communication: "developing", self_awareness: "strong" }));
    expect(weekPlan(60, f)).toEqual([{ label: "Psychology", minutes: 30 }, { label: "Interview", minutes: 20 }, { label: "Communication", minutes: 10 }]);
    expect(weekPlan(30, [])).toEqual([{ label: "Practice journey", minutes: 30 }]);
  });
});

describe("Daily Mission", () => {
  const base: Omit<RoadmapInputs, "preferences" | "diagnostic"> = { readiness: { dimensions: dims({ psychology: "needs_attention", consistency: "developing" }), generatedAt: NOW }, recommendations: [], mission: null, nowIso: NOW };

  it("a new student is asked to set up, then take the diagnostic — each with a reason", () => {
    const r = buildRoadmap({ ...base, preferences: prefs({ onboarded: false }), diagnostic: diag({ baseline: null }) });
    expect(r.today.map((a) => a.href)).toEqual(["/onboarding", "/student/diagnostic", expect.any(String)].slice(0, r.today.length));
    expect(r.today[1].reason).toMatch(/isn't a test you can fail/);
    expect(r.stage.id).toBe("exploration");
    expect(r.focus).toEqual([]);
  });

  it("ranks a mentor's open assessment first, then the weakest area; at most three, no duplicates", () => {
    const r = buildRoadmap({ ...base, preferences: prefs(), diagnostic: diag(), recommendations: [{ title: 'Complete "SRT set 1"', reason: "It's open and due soon.", href: "/student/assessments/1" }], mission: { dayNumber: 2, title: "WAT Practice", href: "/student/practice/day-2/wat-practice", done: 3, total: 60 } });
    expect(r.today).toHaveLength(3);
    expect(r.today[0]).toEqual({ title: 'Complete "SRT set 1"', reason: "It's open and due soon.", href: "/student/assessments/1" });
    expect(r.today[1].href).toBe("/student/practice/psychology");
    expect(r.today[1].reason).toBe("Psychology is your weakest area.");
    expect(new Set(r.today.map((a) => a.href)).size).toBe(3);
    expect(r.today.every((a) => a.reason.length > 0)).toBe(true);
  });

  it("near the SSB date it suggests a mock interview, and keeps self-reported and observed stages apart", () => {
    const r = buildRoadmap({ ...base, preferences: prefs({ targetSsbDate: "2026-10-29", preparationStage: "just_starting" }), diagnostic: diag() });
    expect(r.stage.id).toBe("final_revision");
    expect(r.today.some((a) => a.title === "Run a mock interview" && /in 10 days/.test(a.reason))).toBe(true);
    expect(r.selfReportedStage).toBe("Just starting");
    expect(r.daysToTarget).toBe(10);
  });

  it("suggests a re-assessment four weeks after the baseline", () => {
    const r = buildRoadmap({ ...base, readiness: null, preferences: prefs(), diagnostic: diag({ baseline: summary("2026-09-10T00:00:00Z") }) });
    expect(r.today.some((a) => a.title === "Retake the diagnostic")).toBe(true);
    expect(r.basedOn).toContain("your starting-point diagnostic");
  });
});
