"use server";

// Practice Server Actions — thin entry points; rules live in
// lib/server/practice/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/practice/service";
import type { PracticeItemInput } from "@/types/practice";

export async function saveAnswerAction(slug: string, key: string, patch: unknown) {
  const result = await service.saveMyAnswer(slug, key, patch);
  // Progress rings/badges are rendered on the server from these rows.
  if (result.ok) revalidatePath("/student/practice", "layout");
  return result;
}

export async function submitAttemptAction(slug: string, mode: "test" | "mock", clientKey: string, answers: unknown) {
  const result = await service.submitMyAttempt(slug, mode, clientKey, answers);
  if (result.ok) revalidatePath("/student", "layout");
  return result;
}

export async function saveMockReviewAction(attemptId: string, review: unknown) {
  return service.saveMyMockReview(attemptId, review);
}

// ---- Super Admin --------------------------------------------------------------------

function refreshBank(slug?: string) {
  revalidatePath("/admin/practice");
  if (slug) revalidatePath(`/admin/practice/${slug}`);
  revalidatePath("/student/practice", "layout");
}

export async function createItemAction(slug: string, input: Partial<Record<keyof PracticeItemInput, unknown>>) {
  const result = await service.createItem(slug, input);
  if (result.ok) refreshBank(slug);
  return result;
}

export async function updateItemAction(slug: string, id: string, input: Partial<Record<keyof PracticeItemInput, unknown>>) {
  const result = await service.updateItem(id, input);
  if (result.ok) refreshBank(slug);
  return result;
}

export async function setItemActiveAction(slug: string, id: string, active: boolean) {
  const result = await service.setItemActive(id, active);
  if (result.ok) refreshBank(slug);
  return result;
}

export async function moveItemAction(slug: string, id: string, direction: "up" | "down") {
  const result = await service.moveItem(id, direction);
  if (result.ok) refreshBank(slug);
  return result;
}
