"use server";

// Thin Server Action entry points; every rule, permission check and audit entry lives in
// lib/server/mentor-assignments/service.ts (actions can be invoked by id from any page).

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/mentor-assignments/service";

function refresh(mentorId: string) {
  revalidatePath(`/admin/users/${mentorId}`);
  // The mentor's own lists read the same rows.
  revalidatePath("/mentor");
  revalidatePath("/mentor/mentees");
}

export async function searchAssignableStudentsAction(mentorId: string, q: string) {
  return service.searchAssignableStudents(mentorId, q);
}

export async function assignStudentAction(mentorId: string, studentId: string) {
  const result = await service.assignStudent(mentorId, studentId);
  if (result.ok) refresh(mentorId);
  return result;
}

export async function unassignStudentAction(mentorId: string, studentId: string) {
  const result = await service.unassignStudent(mentorId, studentId);
  if (result.ok) refresh(mentorId);
  return result;
}
