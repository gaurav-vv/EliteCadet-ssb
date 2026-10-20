"use server";

// Academy Server Actions — thin entry points; rules, authorization and audit
// live in lib/server/academies/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/academies/service";
import { getUserDetail } from "@/lib/server/users/service";
import type { AcademyInput } from "@/types/academies";

type AcademyFormValues = Partial<Record<keyof AcademyInput, unknown>>;

function refreshAcademy(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/academies");
  if (id) revalidatePath(`/admin/academies/${id}`);
  revalidatePath("/admin/users", "layout");
}

export async function createAcademyAction(input: AcademyFormValues) {
  const result = await service.createAcademy(input);
  if (result.ok) refreshAcademy();
  return result;
}

export async function updateAcademyAction(id: string, input: AcademyFormValues) {
  const result = await service.updateAcademyProfile(id, input);
  if (result.ok) refreshAcademy(id);
  return result;
}

export async function changeAcademyStatusAction(id: string, status: string) {
  const result = await service.changeAcademyStatus(id, status);
  if (result.ok) refreshAcademy(id);
  return result;
}

export async function addAcademyMemberAction(academyId: string, email: string, role: string) {
  const result = await service.addAcademyMember(academyId, email, role);
  if (result.ok) refreshAcademy(academyId);
  return result;
}

export async function removeAcademyMemberAction(academyId: string, userId: string) {
  const result = await service.removeAcademyMember(academyId, userId);
  if (result.ok) refreshAcademy(academyId);
  return result;
}

// The current role/academy are re-read on the server, never taken from the client.
export async function changeUserAcademyAction(userId: string, academyId: string) {
  const detail = await getUserDetail(userId);
  if (!detail.ok || !detail.data) return { ok: false, error: detail.error ?? { code: "not_found" as const, message: "We couldn't find that user." } };
  const result = await service.changeUserAcademy(userId, academyId, { role: detail.data.user.role, academyId: detail.data.user.academyId });
  if (result.ok) {
    refreshAcademy(detail.data.user.academyId ?? undefined);
    if (academyId) revalidatePath(`/admin/academies/${academyId}`);
  }
  return result;
}

export async function updateMyAcademyAction(input: AcademyFormValues) {
  const result = await service.updateMyAcademy(input);
  if (result.ok) {
    revalidatePath("/academy", "layout");
  }
  return result;
}
