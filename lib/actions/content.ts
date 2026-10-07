"use server";

// Content Server Actions — thin entry points; rules, authorization and audit
// live in lib/server/content/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/content/service";
import type { ContentInput } from "@/types/content";

type Values = Partial<Record<keyof ContentInput, unknown>>;

function refresh(id?: string) {
  revalidatePath("/admin/content");
  if (id) revalidatePath(`/admin/content/${id}`);
  revalidatePath("/student/library", "layout");
  revalidatePath("/mentor/library", "layout");
}

export async function createContentAction(input: Values) {
  const result = await service.createContent(input);
  if (result.ok) refresh();
  return result;
}

export async function updateContentAction(id: string, input: Values) {
  const result = await service.updateContentDetails(id, input);
  if (result.ok) refresh(id);
  return result;
}

export async function changeContentStatusAction(id: string, status: string) {
  const result = await service.changeContentStatus(id, status);
  if (result.ok) refresh(id);
  return result;
}

export async function addContentAssignmentAction(contentId: string, target: { academyId?: string; batchId?: string }) {
  const result = await service.addContentAssignment(contentId, target);
  if (result.ok) refresh(contentId);
  return result;
}

export async function removeContentAssignmentAction(contentId: string, assignmentId: string) {
  const result = await service.removeContentAssignment(contentId, assignmentId);
  if (result.ok) refresh(contentId);
  return result;
}
