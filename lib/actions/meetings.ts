"use server";

// Live meeting Server Actions — thin entry points; every rule lives in
// lib/server/meetings/service.ts and is re-checked on each call.

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/meetings/service";

function refresh(id: string) {
  revalidatePath("/mentor/sessions", "layout");
  revalidatePath(`/mentor/sessions/${id}`);
  revalidatePath("/student/sessions", "layout");
  revalidatePath("/academy/sessions");
}

// Returns a short-lived, room-scoped media token for the signed-in user.
export async function joinMeetingAction(id: string) {
  const result = await service.joinMeeting(id);
  if (result.ok) refresh(id);
  return result;
}

// Lets a waiting student's page poll for "the mentor has started".
export async function meetingJoinStateAction(id: string) {
  const result = await service.getMeetingView(id);
  return result.ok && result.data ? { ok: true as const, join: result.data.join } : { ok: false as const, error: result.error };
}

export async function endMeetingAction(id: string) {
  const result = await service.endMeeting(id);
  if (result.ok) refresh(id);
  return result;
}

export async function moderateParticipantAction(id: string, studentId: string, action: service.ModerationAction) {
  return service.moderateParticipant(id, studentId, action);
}
