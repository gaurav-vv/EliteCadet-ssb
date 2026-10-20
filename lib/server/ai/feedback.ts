// AI feedback on psychology practice (T102). Reads only: evaluations are
// written by the worker (0017/0018). The student sees their own; a mentor sees
// a mentee's (getMyMentee scope + RLS). Academy admins never see feedback text.

import { getMyMentee } from "@/lib/server/academy-people/service";
import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { PSYCHOLOGY_ACTIVITIES } from "@/lib/practice/activities";
import type { AiConfidence, AiDimension, AiEvaluation, AiFeedbackState, AiRating, PsychologyAttemptSummary, PsychologyAttemptView } from "@/types/ai";

type Row = Record<string, unknown>;
type Test = PsychologyAttemptView["test"];
const TESTS: Test[] = ["tat", "wat", "srt", "sdt"];
const RATINGS: AiRating[] = ["needs_attention", "developing", "strong"];
const LEVELS: AiConfidence[] = ["low", "medium", "high"];
const NOT_FOUND = "That practice attempt isn't available.";
const fail = <T>(code: "unauthorized" | "not_found", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const isTest = (v: unknown): v is Test => typeof v === "string" && (TESTS as string[]).includes(v);
export const testTitle = (t: Test) => PSYCHOLOGY_ACTIVITIES.find((a) => a.testType === t)?.title ?? t.toUpperCase();

// Validate stored JSON at the boundary: anything malformed is dropped rather
// than shown half-rendered.
export function toEvaluation(row: Row): AiEvaluation | null {
  if (!Array.isArray(row.dimensions) || typeof row.feedback !== "object" || row.feedback === null) return null;
  const f = row.feedback as Row;
  const dimensions = (row.dimensions as unknown[]).flatMap((d): AiDimension[] => {
    if (typeof d !== "object" || d === null) return [];
    const x = d as Row;
    if (typeof x.dimension !== "string" || !RATINGS.includes(x.rating as AiRating) || !LEVELS.includes(x.confidence as AiConfidence)) return [];
    return [{ id: x.dimension, name: str(x.name, 80) || x.dimension, rating: x.rating as AiRating, confidence: x.confidence as AiConfidence, evidence: Array.isArray(x.evidence) ? x.evidence.map((e) => str(e, 400)).filter(Boolean) : [], note: str(x.note, 400) }];
  });
  const feedback = { observation: str(f.observation, 600), evidence: str(f.evidence, 600), impact: str(f.impact, 600), improvementAction: str(f.improvement_action, 600), recommendedPractice: str(f.recommended_practice, 600) };
  if (dimensions.length === 0 || Object.values(feedback).some((v) => !v)) return null;
  return {
    label: "AI-generated practice evaluation",
    dimensions,
    feedback,
    overallConfidence: LEVELS.includes(row.overall_confidence as AiConfidence) ? (row.overall_confidence as AiConfidence) : "low",
    createdAt: str(row.created_at, 40),
  };
}

export function feedbackState(job: Row | undefined, evaluation: Row | undefined): AiFeedbackState {
  const parsed = evaluation ? toEvaluation(evaluation) : null;
  if (parsed) return { status: "ready", evaluation: parsed };
  if (!job) return { status: "none" };
  return job.status === "dead" || (job.status === "succeeded" && !parsed) ? { status: "unavailable" } : { status: "pending" };
}

function itemsFrom(job: Row | undefined): { prompt: string; response: string }[] | null {
  const items = (job?.input as Row | undefined)?.items;
  if (!Array.isArray(items)) return null;
  return items.flatMap((it) => (typeof it === "object" && it !== null ? [{ prompt: str((it as Row).prompt), response: str((it as Row).response, 5000) }] : []));
}

async function loadAttempt(attemptId: string, studentId: string): Promise<ServiceResult<PsychologyAttemptView>> {
  const supabase = await createClient();
  const { data: attempt, error } = await supabase.from("practice_attempts").select("id, bank_slug, mode, answers, submitted_at").eq("id", attemptId).eq("student_id", studentId).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load this attempt. Please try again.");
  if (!attempt || attempt.mode !== "test" || !isTest(attempt.bank_slug)) return fail("not_found", NOT_FOUND);

  const [jobs, evaluations] = await Promise.all([
    supabase.from("ai_jobs").select("status, input").eq("subject_type", "practice_attempt").eq("subject_id", attemptId).order("created_at", { ascending: false }).limit(1),
    supabase.from("ai_evaluations").select("dimensions, feedback, overall_confidence, created_at").eq("subject_type", "practice_attempt").eq("subject_id", attemptId).order("created_at", { ascending: false }).limit(1),
  ]);
  const failed = jobs.error ?? evaluations.error;
  if (failed) return mapDbError(failed, "We couldn't load the feedback. Please try again.");
  const job = (jobs.data ?? [])[0] as Row | undefined;

  // The job holds a snapshot of the questions; without one (nothing was
  // written) fall back to the bank's current wording.
  let items = itemsFrom(job);
  if (!items) {
    const answers = Array.isArray(attempt.answers) ? (attempt.answers as Row[]) : [];
    const ids = answers.map((a) => a.itemId).filter((id): id is string => typeof id === "string" && isUuid(id));
    const { data: rows } = ids.length > 0 ? await supabase.from("practice_items").select("id, prompt").in("id", ids) : { data: [] };
    const prompts = new Map(((rows ?? []) as Row[]).map((r) => [r.id as string, str(r.prompt)]));
    items = answers.map((a) => ({ prompt: prompts.get(a.itemId as string) ?? "Question no longer available", response: str(a.response, 5000) }));
  }

  return {
    ok: true,
    data: { id: attempt.id, test: attempt.bank_slug, title: testTitle(attempt.bank_slug), submittedAt: str(attempt.submitted_at, 40), items, feedback: feedbackState(job, (evaluations.data ?? [])[0] as Row | undefined) },
  };
}

export async function getMyPsychologyAttempt(attemptId: string): Promise<ServiceResult<PsychologyAttemptView>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return fail("unauthorized", "Only a student can open their practice feedback.");
  if (!isUuid(attemptId)) return fail("not_found", NOT_FOUND);
  return loadAttempt(attemptId, me.id);
}

export async function getMenteePsychologyAttempt(studentId: string, attemptId: string): Promise<ServiceResult<PsychologyAttemptView>> {
  if (!isUuid(attemptId)) return fail("not_found", NOT_FOUND);
  const scope = await getMyMentee(studentId); // "not found" unless in this mentor's batches
  if (!scope.ok) return scope as ServiceResult<never>;
  return loadAttempt(attemptId, studentId);
}

export async function getMyPsychologyHistory(limit = 20): Promise<ServiceResult<PsychologyAttemptSummary[]>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return fail("unauthorized", "Only a student has practice history.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_attempts")
    .select("id, bank_slug, answers, submitted_at")
    .eq("student_id", me.id)
    .eq("mode", "test")
    .in("bank_slug", TESTS)
    .order("submitted_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) return mapDbError(error, "We couldn't load your practice history. Please try again.");
  const attempts = (data ?? []) as Row[];
  const ids = attempts.map((a) => a.id as string);
  const [jobs, evaluations] = ids.length
    ? await Promise.all([
        supabase.from("ai_jobs").select("subject_id, status").eq("subject_type", "practice_attempt").in("subject_id", ids),
        supabase.from("ai_evaluations").select("subject_id, dimensions, feedback, overall_confidence, created_at").eq("subject_type", "practice_attempt").in("subject_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const jobBy = new Map(((jobs.data ?? []) as Row[]).map((j) => [j.subject_id as string, j]));
  const evalBy = new Map(((evaluations.data ?? []) as Row[]).map((e) => [e.subject_id as string, e]));
  return {
    ok: true,
    data: attempts.flatMap((a): PsychologyAttemptSummary[] => {
      if (!isTest(a.bank_slug)) return [];
      const answers = Array.isArray(a.answers) ? (a.answers as Row[]) : [];
      return [{
        id: a.id as string,
        test: a.bank_slug,
        title: testTitle(a.bank_slug),
        submittedAt: str(a.submitted_at, 40),
        answered: answers.filter((x) => str(x.response).trim() !== "").length,
        total: answers.length,
        feedback: feedbackState(jobBy.get(a.id as string), evalBy.get(a.id as string)).status,
      }];
    }),
  };
}
