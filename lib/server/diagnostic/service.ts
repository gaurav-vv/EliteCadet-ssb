// Starting-point diagnostic (T105). Scoring and the baseline rule live in
// submit_diagnostic (0021); this module reads and shapes.

import { feedbackState, toEvaluation } from "@/lib/server/ai/feedback";
import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { DiagnosticFormItem, DiagnosticOverview, DiagnosticSection, DiagnosticSummary, DiagnosticView, SectionScore } from "@/types/diagnostic";

type Row = Record<string, unknown>;
const NOT_FOUND = "That diagnostic isn't available.";
const WEEK_MS = 7 * 86_400_000;

export function sectionOf(key: string): DiagnosticSection {
  if (key.startsWith("dk-")) return "knowledge";
  if (key.startsWith("dr-")) return "reasoning";
  if (key.startsWith("dw-comm")) return "communication";
  if (key.startsWith("dw-sit")) return "situational_reasoning";
  return "self_awareness";
}

const score = (v: unknown): SectionScore => {
  const o = (typeof v === "object" && v !== null ? v : {}) as Row;
  return { correct: Number(o.correct) || 0, total: Number(o.total) || 0 };
};

async function student() {
  const a = await getActor();
  return a && a.profile.role === "student" ? a : null;
}

export async function getDiagnosticForm(): Promise<ServiceResult<DiagnosticFormItem[]>> {
  if (!(await student())) return { ok: false, error: { code: "unauthorized", message: "Only a student takes the diagnostic." } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("practice_items").select("key, bank_slug, prompt, options, position").in("bank_slug", ["diagnostic-mcq", "diagnostic-written"]).eq("active", true).order("bank_slug").order("position");
  if (error) return mapDbError(error, "We couldn't load the diagnostic. Please try again.");
  return {
    ok: true,
    data: ((data ?? []) as Row[]).map((r) => ({
      key: String(r.key),
      section: sectionOf(String(r.key)),
      prompt: String(r.prompt),
      options: Array.isArray(r.options) ? (r.options as Row[]).map((o) => ({ id: String(o.id), label: String(o.label) })) : null,
    })),
  };
}

export function cleanDiagnosticAnswers(raw: unknown): { key: string; optionId?: string; response?: string }[] | null {
  if (!Array.isArray(raw) || raw.length > 40) return null;
  const out: { key: string; optionId?: string; response?: string }[] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null) return null;
    const r = a as Row;
    if (typeof r.key !== "string" || !/^d[krw]-[a-z0-9-]{1,20}$/.test(r.key)) return null;
    if (r.optionId !== undefined && (typeof r.optionId !== "string" || r.optionId.length > 40)) return null;
    if (r.response !== undefined && (typeof r.response !== "string" || r.response.length > 2000)) return null;
    out.push({ key: r.key, ...(r.optionId !== undefined ? { optionId: r.optionId as string } : {}), ...(r.response !== undefined ? { response: r.response as string } : {}) });
  }
  return out;
}

export async function submitDiagnostic(raw: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!(await student())) return { ok: false, error: { code: "unauthorized", message: "Only a student takes the diagnostic." } };
  const answers = cleanDiagnosticAnswers(raw);
  if (!answers) return { ok: false, error: { code: "validation_error", message: "Some answers couldn't be read. Please try again." } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_diagnostic", { p_answers: answers });
  if (error?.code === "23514") return { ok: false, error: { code: "validation_error", message: "You can retake the diagnostic once a week." } };
  if (error) return mapDbError(error, "We couldn't save your diagnostic. Your answers are still here — please try again.");
  return { ok: true, data: { id: String(data) } };
}

function summaryOf(row: Row, evaluation: Row | undefined): DiagnosticSummary {
  const sections = (row.sections ?? {}) as Row;
  const parsed = evaluation ? toEvaluation(evaluation) : null;
  return {
    id: String(row.id),
    kind: row.kind === "baseline" ? "baseline" : "reassessment",
    submittedAt: String(row.submitted_at),
    knowledge: score(sections.knowledge),
    reasoning: score(sections.reasoning),
    written: Object.fromEntries((parsed?.dimensions ?? []).map((d) => [d.id, d.rating])),
  };
}

export async function getMyDiagnosticOverview(nowIso: string): Promise<ServiceResult<DiagnosticOverview>> {
  const me = await student();
  if (!me) return { ok: false, error: { code: "unauthorized", message: "Only a student takes the diagnostic." } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("diagnostic_attempts").select("id, kind, sections, submitted_at").eq("student_id", me.id).order("submitted_at", { ascending: false }).limit(20);
  if (error) return mapDbError(error, "We couldn't load your diagnostic. Please try again.");
  const rows = (data ?? []) as Row[];
  const baselineRow = rows.find((r) => r.kind === "baseline");
  const latestRow = rows.find((r) => r.kind === "reassessment");
  const ids = [baselineRow, latestRow].filter(Boolean).map((r) => String(r!.id));
  const { data: evals } = ids.length ? await supabase.from("ai_evaluations").select("subject_id, dimensions, feedback, overall_confidence, created_at").eq("subject_type", "diagnostic_attempt").in("subject_id", ids) : { data: [] };
  const evalBy = new Map(((evals ?? []) as Row[]).map((e) => [String(e.subject_id), e]));
  const last = rows[0] ? Date.parse(String(rows[0].submitted_at)) : null;
  const next = last !== null && last + WEEK_MS > Date.parse(nowIso) ? new Date(last + WEEK_MS).toISOString() : null;
  return {
    ok: true,
    data: {
      baseline: baselineRow ? summaryOf(baselineRow, evalBy.get(String(baselineRow.id))) : null,
      latest: latestRow ? summaryOf(latestRow, evalBy.get(String(latestRow.id))) : null,
      nextAllowedAt: next,
    },
  };
}

export async function getMyDiagnostic(id: string): Promise<ServiceResult<DiagnosticView>> {
  const me = await student();
  if (!me) return { ok: false, error: { code: "unauthorized", message: "Only a student takes the diagnostic." } };
  if (!isUuid(id)) return { ok: false, error: { code: "not_found", message: NOT_FOUND } };
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("diagnostic_attempts").select("id, kind, answers, sections, submitted_at").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load this diagnostic. Please try again.");
  if (!row) return { ok: false, error: { code: "not_found", message: NOT_FOUND } };
  const [jobs, evals] = await Promise.all([
    supabase.from("ai_jobs").select("status").eq("subject_type", "diagnostic_attempt").eq("subject_id", id).limit(1),
    supabase.from("ai_evaluations").select("dimensions, feedback, overall_confidence, created_at").eq("subject_type", "diagnostic_attempt").eq("subject_id", id).limit(1),
  ]);
  const answers = (Array.isArray(row.answers) ? row.answers : []) as Row[];
  const summary = summaryOf(row, undefined);
  return {
    ok: true,
    data: {
      id: summary.id,
      kind: summary.kind,
      submittedAt: summary.submittedAt,
      knowledge: summary.knowledge,
      reasoning: summary.reasoning,
      multipleChoice: answers.filter((a) => "correct" in a).map((a) => ({ prompt: String(a.prompt ?? ""), correct: a.correct === true, answered: typeof a.optionId === "string" && a.optionId !== "" })),
      written: answers.filter((a) => "response" in a).map((a) => ({ section: sectionOf(String(a.key ?? "")), prompt: String(a.prompt ?? ""), response: String(a.response ?? "") })),
      feedback: feedbackState(((jobs.data ?? []) as Row[])[0], ((evals.data ?? []) as Row[])[0]),
    },
  };
}
