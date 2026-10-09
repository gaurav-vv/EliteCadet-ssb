"use server";

// Academy people Server Actions — thin entry points; scope and rules live in
// lib/server/academy-people/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import * as service from "@/lib/server/academy-people/service";

async function origin(): Promise<string> {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

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
