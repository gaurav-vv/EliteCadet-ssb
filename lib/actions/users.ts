"use server";

// User Management Server Actions — thin entry points; all rules, authorization
// and audit live in lib/server/users/service.ts. Server Actions can be invoked
// by id from any page, so every call is fully re-authorized there.

import { revalidatePath } from "next/cache";
import { changeUserRole, changeUserStatus, type ServiceResult } from "@/lib/server/users/service";

function refresh(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}

export async function changeUserRoleAction(userId: string, role: string): Promise<ServiceResult<null>> {
  const result = await changeUserRole(userId, role);
  if (result.ok) refresh(userId);
  return result;
}

export async function changeUserStatusAction(userId: string, status: string): Promise<ServiceResult<null>> {
  const result = await changeUserStatus(userId, status);
  if (result.ok) refresh(userId);
  return result;
}
