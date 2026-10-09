// Assessments, attempts and mentor feedback (specs.md §8a.4c). The actor
// always comes from the session; RLS + triggers in 0011 enforce the same
// scope and lifecycle (one attempt per student, locked after submit; one
// feedback per attempt, locked once reviewed).

import { getActor, type Actor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import { cleanAnswers, unansweredCount, validateAssessmentInput, validateFeedback, type AssessmentFieldErrors, type FeedbackFieldErrors } from "@/lib/server/assessments/validation";
import { isCategory } from "@/lib/server/content/validation";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { DbError } from "@/lib/server/users/repository";
import type { AssessmentInput, AssessmentQuestion, AssessmentRecord, AssessmentStatus, AttemptAnswer, AttemptRecord, FeedbackInput, FeedbackRecord } from "@/types/assessments";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that assessment.";

const A_COLS = "id, batch_id, mentor_id, title, instructions, category, questions, max_score, due_at, status, created_at, batch:batches(name), mentor:profiles!assessments_mentor_id_fkey(full_name)";
const F_COLS = "id, score, strengths, improvement_areas, comments, status, reviewed_at, mentor:profiles!feedback_mentor_id_fkey(full_name)";
const T_COLS = `id, assessment_id, student_id, answers, status, submitted_at, student:profiles!assessment_attempts_student_id_fkey(full_name, email), feedback(${F_COLS})`;

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | null | undefined;
const text = (v: unknown) => (typeof v === "string" && v ? v : null);

export function toAssessment(row: unknown): AssessmentRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.batch_id !== "string" || typeof r.title !== "string" || typeof r.created_at !== "string") return null;
  const questions = (Array.isArray(r.questions) ? r.questions : []).flatMap((q: unknown): AssessmentQuestion[] => {
    const o = typeof q === "object" && q !== null ? (q as Record<string, unknown>) : {};
    return typeof o.id === "string" && typeof o.prompt === "string" ? [{ id: o.id, prompt: o.prompt }] : [];
  });
  const status = (["draft", "published", "closed"].includes(r.status as string) ? r.status : "draft") as AssessmentStatus;
  return {
    id: r.id,
    batchId: r.batch_id,
    batchName: text(one(r.batch)?.name),
    mentorId: typeof r.mentor_id === "string" ? r.mentor_id : "",
    mentorName: text(one(r.mentor)?.full_name),
    title: r.title,
    instructions: text(r.instructions),
    category: isCategory(r.category) ? r.category : "general",
    questions,
    maxScore: Number(r.max_score) || 10,
    dueAt: text(r.due_at),
    status,
    createdAt: r.created_at,
  };
}

function toFeedback(row: unknown): FeedbackRecord | null {
  const r = one(row);
  if (!r || typeof r.id !== "string") return null;
  return {
    id: r.id,
    mentorName: text(one(r.mentor)?.full_name),
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    strengths: text(r.strengths),
    improvementAreas: text(r.improvement_areas),
    comments: text(r.comments),
    status: r.status === "reviewed" ? "reviewed" : "in_review",
    reviewedAt: text(r.reviewed_at),
  };
}

export function toAttempt(row: unknown): AttemptRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.assessment_id !== "string" || typeof r.student_id !== "string") return null;
  const student = one(r.student);
  const answers = (Array.isArray(r.answers) ? r.answers : []).flatMap((a: unknown): AttemptAnswer[] => {
    const o = typeof a === "object" && a !== null ? (a as Record<string, unknown>) : {};
    return typeof o.questionId === "string" ? [{ questionId: o.questionId, answer: typeof o.answer === "string" ? o.answer : "" }] : [];
  });
  return {
    id: r.id,
    assessmentId: r.assessment_id,
    studentId: r.student_id,
    studentName: text(student?.full_name) ?? text(student?.email),
    answers,
    status: r.status === "submitted" ? "submitted" : "draft",
    submittedAt: text(r.submitted_at),
    feedback: toFeedback(r.feedback),
  };
}

function lifecycleError(error: DbError, fallback: string): ServiceResult<never> {
  if (error.code === "23514") return fail("validation_error", error.message?.includes("not open") ? "This assessment isn't open for answers." : error.message?.includes("locked") ? "This can no longer be changed." : fallback);
  if (error.code === "23505") return fail("validation_error", "That already exists.");
  return mapDbError(error, fallback);
}

async function role(r: "mentor" | "student"): Promise<Actor | null> {
  const actor = await getActor();
  return actor && actor.profile.role === r ? actor : null;
}

// ---- Mentor: assessments -------------------------------------------------------

export async function getMentorAssessments(): Promise<ServiceResult<(AssessmentRecord & { submitted: number; reviewed: number })[]>> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can view assessments.");
  const supabase = await createClient();
  // RLS: assessments of batches this mentor teaches (incl. co-mentors').
  const { data, error } = await supabase.from("assessments").select(`${A_COLS}, assessment_attempts(status, feedback(status))`).order("created_at", { ascending: false }).limit(200);
  if (error) return mapDbError(error, "We couldn't load assessments. Please try again.");
  return {
    ok: true,
    data: (data ?? []).flatMap((row) => {
      const a = toAssessment(row);
      if (!a) return [];
      const attempts = Array.isArray((row as Record<string, unknown>).assessment_attempts) ? ((row as Record<string, unknown>).assessment_attempts as Record<string, unknown>[]) : [];
      const submitted = attempts.filter((t) => t.status === "submitted").length;
      const reviewed = attempts.filter((t) => one(t.feedback)?.status === "reviewed").length;
      return [{ ...a, submitted, reviewed }];
    }),
  };
}

export async function getMentorAssessment(id: string): Promise<ServiceResult<{ assessment: AssessmentRecord; attempts: AttemptRecord[] }>> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can view assessments.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").select(A_COLS).eq("id", id).maybeSingle();
  if (error) return mapDbError(error);
  const assessment = data ? toAssessment(data) : null;
  if (!assessment) return fail("not_found", NOT_FOUND);
  const attempts = await supabase.from("assessment_attempts").select(T_COLS).eq("assessment_id", id).eq("status", "submitted").order("submitted_at", { ascending: true });
  if (attempts.error) return mapDbError(attempts.error);
  return { ok: true, data: { assessment, attempts: (attempts.data ?? []).map(toAttempt).filter((t): t is AttemptRecord => t !== null) } };
}

export async function createAssessment(input: Partial<Record<keyof AssessmentInput, unknown>>, nowIso: string): Promise<ServiceResult<{ id: string }> & { fieldErrors?: AssessmentFieldErrors }> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can create assessments.");
  const parsed = validateAssessmentInput(input, nowIso);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const batches = await findMyBatchIds(me.id);
  if (batches.error) return mapDbError(batches.error);
  if (!batches.data.some((b) => b.id === parsed.value.batch_id)) return { ...fail("validation_error", "You can only create assessments for batches you teach."), fieldErrors: { batchId: "Choose one of your batches." } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").insert({ ...parsed.value, mentor_id: me.id }).select("id").single();
  if (error || !data) return lifecycleError(error ?? {}, "We couldn't save the assessment. Please try again.");
  return { ok: true, data: { id: data.id as string } };
}

export async function updateAssessment(id: string, input: Partial<Record<keyof AssessmentInput, unknown>>, nowIso: string): Promise<ServiceResult<null> & { fieldErrors?: AssessmentFieldErrors }> {
  const current = await getMentorAssessment(id);
  if (!current.ok || !current.data) return current as ServiceResult<never>;
  if (current.data.assessment.status !== "draft") return fail("validation_error", "Only a draft assessment can be edited.");
  const parsed = validateAssessmentInput(input, nowIso);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  if (parsed.value.batch_id !== current.data.assessment.batchId) return { ...fail("validation_error", "An assessment stays with its batch."), fieldErrors: { batchId: "An assessment stays with its batch." } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").update(parsed.value).eq("id", id).eq("status", "draft").select("id");
  if (error) return lifecycleError(error, "We couldn't save the assessment. Please try again.");
  if (!data || data.length === 0) return fail("not_found", NOT_FOUND);
  return { ok: true, data: null };
}

const ALLOWED: Record<AssessmentStatus, AssessmentStatus[]> = { draft: ["published"], published: ["closed"], closed: ["published"] };

export async function changeAssessmentStatus(id: string, status: unknown): Promise<ServiceResult<null>> {
  const current = await getMentorAssessment(id);
  if (!current.ok || !current.data) return current as ServiceResult<never>;
  const from = current.data.assessment.status;
  if (typeof status !== "string" || !ALLOWED[from].includes(status as AssessmentStatus)) return fail("validation_error", "That status change isn't allowed.");
  const supabase = await createClient();
  const { error } = await supabase.from("assessments").update({ status }).eq("id", id).eq("status", from);
  if (error) return lifecycleError(error, "We couldn't change the status. Please try again.");
  return { ok: true, data: null };
}

// ---- Mentor: feedback ------------------------------------------------------------

export async function getAttemptForReview(attemptId: string): Promise<ServiceResult<{ assessment: AssessmentRecord; attempt: AttemptRecord }>> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can evaluate.");
  if (!isUuid(attemptId)) return fail("not_found", "We couldn't find that submission.");
  const supabase = await createClient();
  // RLS: only submitted attempts in batches this mentor teaches are visible.
  const { data, error } = await supabase.from("assessment_attempts").select(T_COLS).eq("id", attemptId).maybeSingle();
  if (error) return mapDbError(error);
  const attempt = data ? toAttempt(data) : null;
  if (!attempt) return fail("not_found", "We couldn't find that submission.");
  const a = await supabase.from("assessments").select(A_COLS).eq("id", attempt.assessmentId).maybeSingle();
  if (a.error) return mapDbError(a.error);
  const assessment = a.data ? toAssessment(a.data) : null;
  if (!assessment) return fail("not_found", "We couldn't find that submission.");
  return { ok: true, data: { assessment, attempt } };
}

// Save (in_review) or submit (reviewed). Upsert on attempt_id: a double
// submit updates the same single row; once reviewed it's locked by trigger.
export async function saveFeedback(attemptId: string, input: Partial<Record<keyof FeedbackInput, unknown>>, final: boolean): Promise<ServiceResult<null> & { fieldErrors?: FeedbackFieldErrors }> {
  const found = await getAttemptForReview(attemptId);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const me = (await getActor())!;
  if (found.data.attempt.feedback?.status === "reviewed") return fail("validation_error", "This submission has already been reviewed.");
  const parsed = validateFeedback(input, found.data.assessment.maxScore, final);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const supabase = await createClient();
  const row = { ...parsed.value, attempt_id: attemptId, mentor_id: me.id, status: final ? "reviewed" : "in_review" };
  const { error } = await supabase.from("feedback").upsert(row, { onConflict: "attempt_id" });
  if (error) return lifecycleError(error, "We couldn't save your feedback. Please try again.");
  return { ok: true, data: null };
}

export async function getReviewQueue(): Promise<ServiceResult<(AttemptRecord & { assessmentTitle: string; batchName: string | null })[]>> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can evaluate.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_attempts")
    .select(`${T_COLS}, assessment:assessments(title, batch:batches(name))`)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(300);
  if (error) return mapDbError(error, "We couldn't load submissions. Please try again.");
  return {
    ok: true,
    data: (data ?? []).flatMap((row) => {
      const t = toAttempt(row);
      if (!t) return [];
      const a = one((row as Record<string, unknown>).assessment);
      return [{ ...t, assessmentTitle: typeof a?.title === "string" ? a.title : "Assessment", batchName: text(one(a?.batch)?.name) }];
    }),
  };
}

// ---- Student --------------------------------------------------------------------

export async function getStudentAssessments(): Promise<ServiceResult<(AssessmentRecord & { attempt: AttemptRecord | null })[]>> {
  const me = await role("student");
  if (!me) return fail("unauthorized", "Only a student can view assessments.");
  const supabase = await createClient();
  const [assessments, attempts] = await Promise.all([
    supabase.from("assessments").select(A_COLS).neq("status", "draft").order("created_at", { ascending: false }).limit(200),
    supabase.from("assessment_attempts").select(T_COLS).eq("student_id", me.id),
  ]);
  if (assessments.error) return mapDbError(assessments.error, "We couldn't load your assessments. Please try again.");
  if (attempts.error) return mapDbError(attempts.error);
  const mine = new Map((attempts.data ?? []).map(toAttempt).filter((t): t is AttemptRecord => t !== null).map((t) => [t.assessmentId, t]));
  return { ok: true, data: (assessments.data ?? []).map(toAssessment).filter((a): a is AssessmentRecord => a !== null).map((a) => ({ ...a, attempt: mine.get(a.id) ?? null })) };
}

export async function getStudentAssessment(id: string, nowIso: string): Promise<ServiceResult<{ assessment: AssessmentRecord; attempt: AttemptRecord | null; open: boolean }>> {
  const me = await role("student");
  if (!me) return fail("unauthorized", "Only a student can open assessments.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").select(A_COLS).eq("id", id).neq("status", "draft").maybeSingle();
  if (error) return mapDbError(error);
  const assessment = data ? toAssessment(data) : null;
  if (!assessment) return fail("not_found", NOT_FOUND);
  const att = await supabase.from("assessment_attempts").select(T_COLS).eq("assessment_id", id).eq("student_id", me.id).maybeSingle();
  if (att.error) return mapDbError(att.error);
  const open = assessment.status === "published" && (!assessment.dueAt || Date.parse(assessment.dueAt) >= Date.parse(nowIso));
  return { ok: true, data: { assessment, attempt: att.data ? toAttempt(att.data) : null, open } };
}

export async function saveAttempt(assessmentId: string, answers: unknown, submit: boolean, nowIso: string): Promise<ServiceResult<{ unanswered: number }>> {
  const found = await getStudentAssessment(assessmentId, nowIso);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const me = (await getActor())!;
  if (!found.data.open) return fail("validation_error", "This assessment isn't open for answers.");
  if (found.data.attempt?.status === "submitted") return fail("validation_error", "You've already submitted this assessment.");
  const clean = cleanAnswers(found.data.assessment.questions, answers);
  const unanswered = unansweredCount(clean);
  if (submit && unanswered === clean.length) return fail("validation_error", "Answer at least one question before submitting.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_attempts")
    .upsert({ assessment_id: assessmentId, student_id: me.id, answers: clean, status: submit ? "submitted" : "draft" }, { onConflict: "assessment_id,student_id" });
  if (error) return lifecycleError(error, "We couldn't save your answers. Please try again.");
  return { ok: true, data: { unanswered } };
}

// ---- Academy admin + mentee history ---------------------------------------------

export async function getAcademyAssessments(): Promise<ServiceResult<(AssessmentRecord & { submitted: number; reviewed: number })[]>> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "academy_admin") return fail("unauthorized", "Only an academy admin can view academy assessments.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessments").select(`${A_COLS}, assessment_attempts(status, feedback(status))`).eq("academy_id", actor.profile.academyId ?? "").order("created_at", { ascending: false }).limit(300);
  if (error) return mapDbError(error, "We couldn't load assessments. Please try again.");
  return {
    ok: true,
    data: (data ?? []).flatMap((row) => {
      const a = toAssessment(row);
      if (!a) return [];
      const attempts = ((row as Record<string, unknown>).assessment_attempts as Record<string, unknown>[] | undefined) ?? [];
      return [{ ...a, submitted: attempts.filter((t) => t.status === "submitted").length, reviewed: attempts.filter((t) => one(t.feedback)?.status === "reviewed").length }];
    }),
  };
}

// A mentee's submitted work in this mentor's batches (RLS-scoped).
export async function getMenteeHistory(studentId: string): Promise<ServiceResult<(AttemptRecord & { assessmentTitle: string; maxScore: number })[]>> {
  const me = await role("mentor");
  if (!me) return fail("unauthorized", "Only a mentor can view this.");
  if (!isUuid(studentId)) return fail("not_found", "We couldn't find that student.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessment_attempts").select(`${T_COLS}, assessment:assessments(title, max_score)`).eq("student_id", studentId).eq("status", "submitted").order("submitted_at", { ascending: false }).limit(100);
  if (error) return mapDbError(error);
  return {
    ok: true,
    data: (data ?? []).flatMap((row) => {
      const t = toAttempt(row);
      const a = one((row as Record<string, unknown>).assessment);
      return t ? [{ ...t, assessmentTitle: typeof a?.title === "string" ? a.title : "Assessment", maxScore: Number(a?.max_score) || 10 }] : [];
    }),
  };
}
