"use server";

// Server Actions — these mutate the mock, in-memory "backend" state in
// lib/mock/mentor.ts. That state only exists in the server process, so a
// mutation performed by a plain function called from a Client Component
// would silently mutate the *client's own bundled copy* of the module and
// never show up on any server-rendered page (dashboard, evaluations list,
// mentee detail). Server Actions run on the server, so they mutate the real
// singleton that those pages read on their next render — resets on server
// restart, same as the rest of this pre-backend mock layer (status.md,
// 2026-09-18).

import { revalidatePath } from "next/cache";
import {
  evaluations,
  getMenteeDetail,
  sessions,
  MENTOR_NAME,
  clearMentorDemoData,
  resetMentorDemoData,
} from "@/lib/mock/mentor";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type { Evaluation, EvaluationInput, MentorSession, SessionInput } from "@/types/mentor";

export interface ActionError {
  code: "validation_error" | "not_found";
  message: string;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: ActionError;
}

function validateEvaluationInput(input: EvaluationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!getMenteeDetail(input.menteeId)) errors.menteeId = "Select a mentee.";
  if (!input.activityOrSession.trim()) errors.activityOrSession = "Name the activity or session being evaluated.";
  if (Number.isNaN(input.score) || input.score < 0 || input.score > 100) errors.score = "Score must be between 0 and 100.";
  if (!input.strengths.trim()) errors.strengths = "List at least one strength.";
  if (!input.improvementAreas.trim()) errors.improvementAreas = "List at least one improvement area.";
  return errors;
}

const processedEvaluations = new Map<string, Evaluation>();

export async function submitEvaluationAction(
  input: EvaluationInput,
  idempotencyKey: string,
): Promise<ActionResult<Evaluation>> {
  const existing = processedEvaluations.get(idempotencyKey);
  if (existing) {
    return { ok: true, data: existing };
  }

  const fieldErrors = validateEvaluationInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const { profile } = await getCurrentUserAndProfile();
  const mentee = getMenteeDetail(input.menteeId)!;
  const evaluation: Evaluation = {
    id: idempotencyKey,
    menteeId: input.menteeId,
    menteeName: mentee.fullName,
    activityOrSession: input.activityOrSession,
    score: input.score,
    strengths: input.strengths,
    improvementAreas: input.improvementAreas,
    comments: input.comments,
    status: "reviewed",
    evaluatorName: profile?.fullName || MENTOR_NAME,
    createdAt: new Date().toISOString(),
  };

  evaluations.unshift(evaluation);
  mentee.evaluationStatus = "reviewed";
  mentee.mentorFeedback.unshift({ id: evaluation.id, comment: evaluation.comments || evaluation.strengths, createdAt: evaluation.createdAt });
  processedEvaluations.set(idempotencyKey, evaluation);

  revalidatePath("/mentor");
  revalidatePath("/mentor/evaluations");
  revalidatePath(`/mentor/mentees/${input.menteeId}`);
  revalidatePath("/mentor/mentees");

  return { ok: true, data: evaluation };
}

function validateSessionInput(input: SessionInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "Give the session a title.";
  if (!getMenteeDetail(input.menteeId)) errors.menteeId = "Select a mentee.";
  if (!input.scheduledFor) errors.scheduledFor = "Pick a date and time.";
  return errors;
}

export async function createSessionAction(input: SessionInput): Promise<ActionResult<MentorSession>> {
  const fieldErrors = validateSessionInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const mentee = getMenteeDetail(input.menteeId)!;
  const session: MentorSession = {
    id: `session-${Date.now()}`,
    title: input.title,
    menteeId: input.menteeId,
    menteeName: mentee.fullName,
    scheduledFor: input.scheduledFor,
    status: "scheduled",
  };
  sessions.push(session);

  revalidatePath("/mentor/sessions");
  revalidatePath("/mentor");

  return { ok: true, data: session };
}

export async function cancelSessionAction(id: string): Promise<ActionResult<null>> {
  const session = sessions.find((s) => s.id === id);
  if (!session) {
    return { ok: false, error: { code: "not_found", message: "Session not found." } };
  }
  session.status = "cancelled";

  revalidatePath("/mentor/sessions");
  revalidatePath("/mentor");

  return { ok: true, data: null };
}

export async function loadDemoDataAction(): Promise<ActionResult<null>> {
  resetMentorDemoData();
  revalidatePath("/mentor");
  revalidatePath("/mentor/mentees");
  revalidatePath("/mentor/evaluations");
  revalidatePath("/mentor/sessions");
  return { ok: true, data: null };
}

export async function clearDemoDataAction(): Promise<ActionResult<null>> {
  clearMentorDemoData();
  revalidatePath("/mentor");
  revalidatePath("/mentor/mentees");
  revalidatePath("/mentor/evaluations");
  revalidatePath("/mentor/sessions");
  return { ok: true, data: null };
}
