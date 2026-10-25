"use server";

// Academy people Server Actions — thin entry points; scope and rules live in
// lib/server/academy-people/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import { requestOrigin as origin } from "@/lib/server/auth/request-origin";
import * as service from "@/lib/server/academy-people/service";

function refresh() {
  revalidatePath("/academy/students", "layout");
  revalidatePath("/academy/batches", "layout");
  revalidatePath("/academy/mentors");
}

export async function addAcademyStudentAction(input: { email: string; fullName: string }) {
  const result = await service.addAcademyStudent(input, await origin());
  if (result.ok) refresh();
  return result;
}

export async function removeAcademyStudentAction(studentId: string) {
  const result = await service.removeAcademyStudent(studentId);
  if (result.ok) refresh();
  return result;
}

export async function inviteAcademyMentorAction(input: { email: string; fullName: string }) {
  const result = await service.inviteAcademyMentor(input, await origin());
  if (result.ok) refresh();
  return result;
}

export async function addMentorManuallyAction(input: { email: string; fullName: string; phone: string; qualifications: string; specialization: string }) {
  const result = await service.addMentorManually(input);
  if (result.ok) refresh();
  return result;
}

export async function resendMentorInviteAction(mentorId: string) {
  const result = await service.resendMentorInvite(mentorId, await origin());
  if (result.ok) refresh();
  return result;
}

export async function revokeMentorInviteAction(mentorId: string) {
  const result = await service.revokeMentorInvite(mentorId);
  if (result.ok) refresh();
  return result;
}
