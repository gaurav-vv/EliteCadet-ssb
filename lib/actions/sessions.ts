"use server";

// Session Server Actions — thin entry points; rules live in
// lib/server/sessions/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/sessions/service";
import type { SessionInput } from "@/types/sessions";

type Values = Partial<Record<keyof SessionInput, unknown>>;
const now = () => new Date().toISOString();

function refresh(id?: string) {
  revalidatePath("/mentor/sessions", "layout");
  if (id) revalidatePath(`/mentor/sessions/${id}`);
  revalidatePath("/student/sessions");
  revalidatePath("/academy/sessions");
  revalidatePath("/academy/batches", "layout");
}

export async function scheduleSessionAction(input: Values) {
  const result = await service.scheduleSession(input, now());
  if (result.ok) refresh();
  return result;
}

export async function updateSessionAction(id: string, input: Values) {
  const result = await service.updateSession(id, input, now());
  if (result.ok) refresh(id);
  return result;
}

export async function cancelSessionAction(id: string, reason: string) {
  const result = await service.cancelSession(id, reason);
  if (result.ok) refresh(id);
  return result;
}

export async function completeSessionAction(id: string) {
  const result = await service.completeSession(id, now());
  if (result.ok) refresh(id);
  return result;
}

export async function addAvailabilityAction(input: { weekday: string; startTime: string; endTime: string }) {
  const result = await service.addAvailability(input);
  if (result.ok) revalidatePath("/mentor/sessions", "layout");
  return result;
}

export async function removeAvailabilityAction(id: string) {
  const result = await service.removeAvailability(id);
  if (result.ok) revalidatePath("/mentor/sessions", "layout");
  return result;
}
