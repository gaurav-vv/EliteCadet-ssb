// Assessment / attempt / feedback rules — pure (tests/unit/lib/assessments-validation.test.ts).

import { isCategory } from "@/lib/server/content/validation";
import { istToUtcIso } from "@/lib/server/sessions/validation";
import type { ContentCategory } from "@/types/content";
import type { AssessmentInput, AssessmentQuestion, AttemptAnswer, FeedbackInput } from "@/types/assessments";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type AssessmentFieldErrors = Partial<Record<keyof AssessmentInput, string>>;

export interface CleanAssessment {
  batch_id: string;
  title: string;
  instructions: string | null;
  category: ContentCategory;
  questions: AssessmentQuestion[];
  max_score: number;
  due_at: string | null;
}

// Due date = end of that IST day.
export function validateAssessmentInput(input: Partial<Record<keyof AssessmentInput, unknown>>, nowIso: string): { ok: true; value: CleanAssessment } | { ok: false; errors: AssessmentFieldErrors } {
  const errors: AssessmentFieldErrors = {};
  const batchId = str(input.batchId);
  const title = str(input.title).replace(/\s+/g, " ");
  const instructions = str(input.instructions);
  const prompts = Array.isArray(input.questions) ? input.questions.map(str).filter(Boolean) : [];
  const maxScore = Number(str(input.maxScore));
  const dueDate = str(input.dueDate);

  if (!UUID_RE.test(batchId)) errors.batchId = "Choose one of your batches.";
  if (title.length < 3 || title.length > 140) errors.title = "Title must be 3–140 characters.";
  if (instructions.length > 2000) errors.instructions = "Keep instructions under 2,000 characters.";
  if (!isCategory(input.category)) errors.category = "Choose a category.";
  if (prompts.length < 1 || prompts.length > 20) errors.questions = "Add 1–20 questions.";
  else if (prompts.some((p) => p.length < 5 || p.length > 1000)) errors.questions = "Each question needs 5–1,000 characters.";
  if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 100) errors.maxScore = "Maximum score must be a whole number from 1 to 100.";
  let dueAt: string | null = null;
  if (dueDate) {
    dueAt = istToUtcIso(dueDate, "23:59");
    if (!dueAt) errors.dueDate = "Enter a valid date.";
    else if (Date.parse(dueAt) < Date.parse(nowIso)) errors.dueDate = "Choose today or a later date.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      batch_id: batchId,
      title,
      instructions: instructions || null,
      category: input.category as ContentCategory,
      questions: prompts.map((prompt, i) => ({ id: `q${i + 1}`, prompt })),
      max_score: maxScore,
      due_at: dueAt,
    },
  };
}

// Keep only answers to real questions, trimmed and capped; one per question.
export function cleanAnswers(questions: AssessmentQuestion[], raw: unknown): AttemptAnswer[] {
  const ids = new Set(questions.map((q) => q.id));
  const seen = new Map<string, string>();
  for (const item of Array.isArray(raw) ? raw : []) {
    const o = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const id = typeof o.questionId === "string" ? o.questionId : "";
    if (ids.has(id) && !seen.has(id)) seen.set(id, str(o.answer).slice(0, 5000));
  }
  return questions.map((q) => ({ questionId: q.id, answer: seen.get(q.id) ?? "" }));
}

export function unansweredCount(answers: AttemptAnswer[]): number {
  return answers.filter((a) => !a.answer).length;
}

export type FeedbackFieldErrors = Partial<Record<keyof FeedbackInput, string>>;

export interface CleanFeedback {
  score: number | null;
  strengths: string | null;
  improvement_areas: string | null;
  comments: string | null;
}

// `final` = submitting the review: score, strengths and improvement areas are
// then required (specs.md §7.5). A draft may be partial.
export function validateFeedback(input: Partial<Record<keyof FeedbackInput, unknown>>, maxScore: number, final: boolean): { ok: true; value: CleanFeedback } | { ok: false; errors: FeedbackFieldErrors } {
  const errors: FeedbackFieldErrors = {};
  const scoreRaw = str(input.score);
  const strengths = str(input.strengths);
  const improvementAreas = str(input.improvementAreas);
  const comments = str(input.comments);
  let score: number | null = null;
  if (scoreRaw) {
    score = Number(scoreRaw);
    if (!/^\d+(\.\d{1,2})?$/.test(scoreRaw) || score < 0 || score > maxScore) errors.score = `Score must be between 0 and ${maxScore}.`;
  } else if (final) errors.score = "Give a score.";
  if (strengths.length > 3000) errors.strengths = "Keep it under 3,000 characters.";
  else if (final && strengths.length < 3) errors.strengths = "Note at least one strength.";
  if (improvementAreas.length > 3000) errors.improvementAreas = "Keep it under 3,000 characters.";
  else if (final && improvementAreas.length < 3) errors.improvementAreas = "Note at least one area to improve.";
  if (comments.length > 3000) errors.comments = "Keep it under 3,000 characters.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { score, strengths: strengths || null, improvement_areas: improvementAreas || null, comments: comments || null } };
}
