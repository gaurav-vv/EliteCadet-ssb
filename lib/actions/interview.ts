"use server";

// AI interview Server Actions — thin entry points over lib/server/ai/interview.ts.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/ai/interview";

export async function startInterviewAction(mode: unknown, topic: unknown, piq: unknown) {
  return service.startInterview(mode, topic, piq);
}

export async function answerTurnAction(sessionId: string, turnId: string, answer: unknown) {
  const result = await service.answerTurn(turnId, answer);
  if (result.ok) revalidatePath(`/student/practice/interview/ai/${sessionId}`);
  return result;
}

export async function skipWaitAction(sessionId: string) {
  const result = await service.skipWait(sessionId);
  if (result.ok) revalidatePath(`/student/practice/interview/ai/${sessionId}`);
  return result;
}
