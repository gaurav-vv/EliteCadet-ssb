"use server";

// Mentor content + content-request Server Actions — thin entry points; the
// rules live in lib/server/content/{mentor-service,requests}.ts.

import { revalidatePath } from "next/cache";
import * as mentorContent from "@/lib/server/content/mentor-service";
import * as requests from "@/lib/server/content/requests";
import type { ContentInput, ContentRequestInput } from "@/types/content";

type Values = Partial<Record<keyof ContentInput, unknown>>;

function refresh(id?: string) {
  revalidatePath("/mentor/content", "layout");
  if (id) revalidatePath(`/mentor/content/${id}`);
  revalidatePath("/student/library", "layout");
}

export async function createMyContentAction(input: Values) {
  const result = await mentorContent.createMyContent(input);
  if (result.ok) refresh();
  return result;
}

export async function updateMyContentAction(id: string, input: Values) {
  const result = await mentorContent.updateMyContent(id, input);
  if (result.ok) refresh(id);
  return result;
}

export async function changeMyContentStatusAction(id: string, status: string) {
  const result = await mentorContent.changeMyContentStatus(id, status);
  if (result.ok) refresh(id);
  return result;
}

export async function assignMyContentAction(contentId: string, target: { batchId?: string; academyId?: string }) {
  const result = await mentorContent.assignMyContent(contentId, target.batchId);
  if (result.ok) refresh(contentId);
  return result;
}

export async function unassignMyContentAction(contentId: string, assignmentId: string) {
  const result = await mentorContent.unassignMyContent(contentId, assignmentId);
  if (result.ok) refresh(contentId);
  return result;
}

export async function copyTemplateAction(templateId: string) {
  const result = await mentorContent.copyTemplate(templateId);
  if (result.ok) refresh();
  return result;
}

export async function createRequestAction(input: Partial<Record<keyof ContentRequestInput, unknown>>) {
  const today = new Date().toISOString().slice(0, 10);
  const result = await requests.createRequest(input, today);
  if (result.ok) revalidatePath("/mentor/content/requests");
  return result;
}

export async function respondToQuoteAction(id: string, accept: boolean) {
  const result = await requests.respondToQuote(id, accept);
  if (result.ok) revalidatePath("/mentor/content/requests");
  return result;
}

export async function cancelRequestAction(id: string) {
  const result = await requests.cancelRequest(id);
  if (result.ok) revalidatePath("/mentor/content/requests");
  return result;
}
