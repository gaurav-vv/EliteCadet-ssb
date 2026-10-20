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

// In-meeting chat, reactions and raised hands — authorized per call in the
// service (live meeting, caller in it, not removed) and broadcast by the server.
export async function listMeetingMessagesAction(id: string) {
  return service.listMessages(id);
}

export async function sendMeetingMessageAction(id: string, body: string) {
  return service.sendMessage(id, body);
}

export async function sendReactionAction(id: string, emoji: string) {
  return service.sendReaction(id, emoji);
}

export async function setMyHandAction(id: string, raised: boolean) {
  return service.setMyHand(id, raised);
}

// Host only (mentor of the meeting or an admin of its academy).
export async function muteAllStudentsAction(id: string) {
  return service.muteAllStudents(id);
}

export async function lowerAllHandsAction(id: string) {
  return service.lowerAllHands(id);
}
