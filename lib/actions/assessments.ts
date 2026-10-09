"use server";

// Assessment / attempt / feedback Server Actions — thin entry points; the
// rules live in lib/server/assessments/service.ts and are re-checked each call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/assessments/service";
import type { AssessmentInput, FeedbackInput } from "@/types/assessments";

const now = () => new Date().toISOString();

function refresh() {
  revalidatePath("/mentor/assessments", "layout");
  revalidatePath("/mentor/evaluations", "layout");
  revalidatePath("/mentor/mentees", "layout");
  revalidatePath("/student/assessments", "layout");
  revalidatePath("/academy/assessments");
}

export async function createAssessmentAction(input: Partial<Record<keyof AssessmentInput, unknown>>) {
  const result = await service.createAssessment(input, now());
  if (result.ok) refresh();
  return result;
}

export async function updateAssessmentAction(id: string, input: Partial<Record<keyof AssessmentInput, unknown>>) {
  const result = await service.updateAssessment(id, input, now());
  if (result.ok) refresh();
  return result;
}

export async function changeAssessmentStatusAction(id: string, status: string) {
  const result = await service.changeAssessmentStatus(id, status);
  if (result.ok) refresh();
  return result;
}

export async function saveFeedbackAction(attemptId: string, input: Partial<Record<keyof FeedbackInput, unknown>>, final: boolean) {
  const result = await service.saveFeedback(attemptId, input, final);
  if (result.ok) refresh();
  return result;
}

export async function saveAttemptAction(assessmentId: string, answers: { questionId: string; answer: string }[], submit: boolean) {
  const result = await service.saveAttempt(assessmentId, answers, submit, now());
  if (result.ok) refresh();
  return result;
}
