"use server";

// Progress Server Actions — thin entry points; rules live in
// lib/server/progress/service.ts and are re-checked on every call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/progress/service";

export async function markAttendanceAction(sessionId: string, entries: { studentId: string; status: string }[]) {
  const result = await service.markAttendance(sessionId, entries);
  if (result.ok) {
    revalidatePath(`/mentor/sessions/${sessionId}`);
    revalidatePath("/mentor/mentees", "layout");
    revalidatePath("/student/progress");
    revalidatePath("/academy/performance");
  }
  return result;
}

export async function setContentDoneAction(contentId: string, done: boolean) {
  const result = await service.setContentDone(contentId, done);
  if (result.ok) {
    revalidatePath(`/student/library/${contentId}`);
    revalidatePath("/student/progress");
  }
  return result;
}
