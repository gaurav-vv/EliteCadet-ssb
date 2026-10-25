// Live meeting rooms (T094, specs.md §8a.4h): who may join, when, with which
// media permissions, and the mentor's controls. Everything is decided here on
// the server from the signed-in account and the server clock; the database
// (0022–0025 migrations) enforces the same rules again. Chat and reactions are
// authorized here and broadcast by the server; clients cannot publish data.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import * as livekit from "@/lib/server/meetings/livekit";
import { meetingDbError } from "@/lib/server/meetings/errors";
import { SESSION_COLUMNS, toSession, withHostNames } from "@/lib/server/sessions/service";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { createClient } from "@/lib/supabase/server";
import { MEETING_BATCH_MAX_STUDENTS, MEETING_OPENS_MINUTES_BEFORE, type SessionRecord } from "@/types/sessions";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized" | "server_error" | "not_set_up", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that meeting.";
const NOT_CONFIGURED = "Video meetings aren't set up on this server yet. Ask your platform admin to configure LiveKit (see docs/live-meetings.md).";
const PROVIDER_DOWN = "We couldn't reach the video service. Please try again in a moment.";

// ---- Loading ------------------------------------------------------------------

// RLS (can_see_session) decides visibility; the extra checks below narrow it to
// the roles that take part: the meeting's own mentor, an active admin of its
// academy (co-host), and its students. Super admins don't join meetings.
async function loadMeeting(actor: Actor, id: string): Promise<ServiceResult<SessionRecord>> {
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const role = actor.profile.role;
  if (role !== "mentor" && role !== "student" && role !== "academy_admin") return fail("not_found", NOT_FOUND);
  if (role === "academy_admin" && !actor.profile.academyId) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  let query = supabase.from("sessions").select(SESSION_COLUMNS).eq("id", id);
  if (role === "academy_admin") query = query.eq("academy_id", actor.profile.academyId!);
  const { data, error } = await query.maybeSingle();
  if (error) return mapDbError(error, "We couldn't load this meeting. Please try again.");
  const session = data ? toSession(data) : null;
  if (!session || !session.meetingKind) return fail("not_found", NOT_FOUND);
  if (role === "mentor" && session.mentorId !== actor.id) return fail("not_found", NOT_FOUND);
  return { ok: true, data: (await withHostNames([session]))[0] };
}

function participantRole(actor: Actor): livekit.ParticipantRole {
  return actor.profile.role === "mentor" ? "mentor" : actor.profile.role === "academy_admin" ? "admin" : "student";
}

// The name others see in the room — from the profile, never from the browser.
function displayName(actor: Actor): string {
  const role = participantRole(actor);
  return actor.profile.fullName?.trim() || (role === "mentor" ? "Mentor" : role === "admin" ? "Academy admin" : "Student");
}

// A started meeting whose scheduled end has passed is finished (end clamped
// to the schedule), whoever looks at it first.
async function finalizeIfOver(session: SessionRecord, nowMs: number): Promise<boolean> {
  if (session.status !== "scheduled" || !session.actualStartedAt || session.actualEndedAt || nowMs < Date.parse(session.endsAt)) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("end_live_meeting", { p_session: session.id });
  if (error) {
    console.error(`[meetings] auto-finish failed: code=${error.code ?? "none"}`);
    return false;
  }
  if (data === true) {
    const cfg = livekit.liveKitConfig();
    if (cfg) await livekit.closeRoom(cfg, session.id).catch(() => undefined);
  }
  return data === true;
}

export type JoinState =
  | "open" // may join now
  | "too_early" // before the room opens
  | "waiting_for_mentor" // student: room open, no host (mentor/admin) has started
  | "ended"
  | "cancelled"
  | "removed" // the mentor removed this student
  | "not_configured"; // LiveKit env missing on this server

export interface MeetingView {
  session: SessionRecord;
  viewer: { id: string; role: livekit.ParticipantRole; name: string };
  join: JoinState;
  opensAt: string;
  // How many students the meeting is for (whole batch as enrolled now, or 1).
  audienceCount: number | null;
}

export async function getMeetingView(id: string): Promise<ServiceResult<MeetingView>> {
  const actor = await getActor();
  if (!actor) return fail("unauthorized", "Please sign in again.");
  let found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const now = Date.now();
  if (await finalizeIfOver(found.data, now)) {
    found = await loadMeeting(actor, id);
    if (!found.ok || !found.data) return found as ServiceResult<never>;
  }
  const s = found.data;
  const role = participantRole(actor);
  const opensAt = new Date(Date.parse(s.startsAt) - MEETING_OPENS_MINUTES_BEFORE * 60_000).toISOString();

  let join: JoinState;
  if (s.status === "cancelled") join = "cancelled";
  else if (s.status === "completed" || s.actualEndedAt || now >= Date.parse(s.endsAt)) join = "ended";
  else if (now < Date.parse(opensAt)) join = "too_early";
  else if (role === "student" && !s.actualStartedAt) join = "waiting_for_mentor";
  else join = "open";

  if (join === "open" && role === "student" && (await isRemoved(s.id, actor.id))) join = "removed";
  if (join === "open" && !livekit.liveKitConfig()) join = "not_configured";
  const supabase = await createClient();
  const { data: count } = await supabase.rpc("live_meeting_audience_count", { p_session: s.id });
  return { ok: true, data: { session: s, viewer: { id: actor.id, role, name: displayName(actor) }, join, opensAt, audienceCount: typeof count === "number" ? count : null } };
}

async function isRemoved(sessionId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("live_meeting_removals").select("user_id").eq("session_id", sessionId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

// ---- Joining -----------------------------------------------------------------

export interface JoinGrant {
  serverUrl: string;
  token: string;
  role: livekit.ParticipantRole;
  kind: "one_to_one" | "batch";
  endsAt: string;
  // When the meeting actually started (server clock), for the elapsed timer.
  startedAt: string;
}

const JOIN_REFUSED: Record<Exclude<JoinState, "open">, string> = {
  too_early: `The room opens ${MEETING_OPENS_MINUTES_BEFORE} minutes before the start time.`,
  waiting_for_mentor: "Your mentor hasn't started the meeting yet. This page will let you in as soon as they do.",
  ended: "This meeting has ended.",
  cancelled: "This meeting was cancelled.",
  removed: "Your mentor removed you from this meeting.",
  not_configured: NOT_CONFIGURED,
};

// The only way to get a media token. A host's (mentor's or academy admin's)
// first join starts the meeting (server clock) and creates the room with a
// participant cap: the students plus the mentor and one admin.
export async function joinMeeting(id: string): Promise<ServiceResult<JoinGrant>> {
  const view = await getMeetingView(id);
  if (!view.ok || !view.data) return view as ServiceResult<never>;
  const { session: s, viewer, join } = view.data;
  if (join !== "open") return fail(join === "not_configured" ? "not_set_up" : "validation_error", JOIN_REFUSED[join]);
  const cfg = livekit.liveKitConfig();
  if (!cfg) return fail("not_set_up", NOT_CONFIGURED);

  if (viewer.role !== "student") {
    const supabase = await createClient();
    const { error } = await supabase.rpc("start_live_meeting", { p_session: s.id });
    if (error) return meetingDbError(error, "We couldn't start the meeting. Please try again.");
    try {
      await livekit.ensureRoom(cfg, s.id, s.meetingKind === "batch" ? MEETING_BATCH_MAX_STUDENTS + 2 : 3);
    } catch (error) {
      console.error(`[meetings] create room failed: ${livekit.describeProviderError(error)}`);
      return fail("server_error", PROVIDER_DOWN);
    }
  }

  // A host's first join just started it: start_live_meeting stamped now().
  const startedAt = s.actualStartedAt ?? new Date().toISOString();
  try {
    const token = await livekit.createJoinToken(cfg, { sessionId: s.id, userId: viewer.id, name: viewer.name, role: viewer.role, kind: s.meetingKind! });
    return { ok: true, data: { serverUrl: cfg.url, token, role: viewer.role, kind: s.meetingKind!, endsAt: s.endsAt, startedAt } };
  } catch {
    return fail("server_error", "We couldn't prepare your meeting access. Please try again.");
  }
}

// ---- Mentor controls -----------------------------------------------------------

// The meeting's mentor, or an admin of its academy (loadMeeting scopes both).
async function hostActor(): Promise<Actor | null> {
  const actor = await getActor();
  return actor && (actor.profile.role === "mentor" || actor.profile.role === "academy_admin") ? actor : null;
}

async function myLiveMeeting(id: string): Promise<ServiceResult<{ session: SessionRecord; cfg: livekit.LiveKitConfig }>> {
  const actor = await hostActor();
  if (!actor) return fail("unauthorized", "Only the meeting's mentor or academy admin can do that.");
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const cfg = livekit.liveKitConfig();
  if (!cfg) return fail("not_set_up", NOT_CONFIGURED);
  return { ok: true, data: { session: found.data, cfg } };
}

export const ROOM_CLOSE_FAILED = "The meeting is ended in EliteCadet, but the video service didn't confirm that everyone was disconnected. Press End again to retry.";

// Ends the meeting for everyone. Two steps, both safe to repeat:
//  1. the database (end_live_meeting): completed, server end time, open
//     attendance closed, 75% attendance finalized — idempotent;
//  2. the video room is deleted, which disconnects every participant.
// Success is reported only when BOTH succeeded; if the room couldn't be
// deleted the caller gets an error and can simply retry.
export async function endMeeting(id: string): Promise<ServiceResult<null>> {
  const actor = await hostActor();
  if (!actor) return fail("unauthorized", "Only the meeting's mentor or academy admin can end it.");
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  if (!found.data.actualStartedAt) return fail("validation_error", "This meeting hasn't started. Cancel it instead if it isn't happening.");
  if (found.data.status === "cancelled") return fail("validation_error", "This meeting was cancelled.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_live_meeting", { p_session: id });
  if (error) return meetingDbError(error, "We couldn't end the meeting. Please try again.");
  const cfg = livekit.liveKitConfig();
  if (!cfg) return { ok: true, data: null }; // no video service = no room to close
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await livekit.closeRoom(cfg, id);
      return { ok: true, data: null };
    } catch (e) {
      console.error(`[meetings] close room failed (attempt ${attempt}): ${livekit.describeProviderError(e)}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  return fail("server_error", ROOM_CLOSE_FAILED);
}

export type ModerationAction = "allow_audio" | "allow_video" | "revoke" | "mute" | "remove" | "lower_hand";
const ACTIONS: ModerationAction[] = ["allow_audio", "allow_video", "revoke", "mute", "remove", "lower_hand"];

// Only students in this meeting's audience can be targeted, never the mentor.
async function isAudienceMember(session: SessionRecord, studentId: string): Promise<boolean> {
  if (!isUuid(studentId) || studentId === session.mentorId) return false;
  if (!session.forWholeBatch) return session.participantIds.includes(studentId);
  const supabase = await createClient();
  const { data } = await supabase.from("batch_students").select("student_id").eq("batch_id", session.batchId).eq("student_id", studentId).maybeSingle();
  return Boolean(data);
}

export async function moderateParticipant(id: string, studentId: string, action: unknown): Promise<ServiceResult<null>> {
  if (!ACTIONS.includes(action as ModerationAction)) return fail("validation_error", "Unknown action.");
  const live = await myLiveMeeting(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  const { session: s, cfg } = live.data;
  if (s.status !== "scheduled" || !s.actualStartedAt || s.actualEndedAt) return fail("validation_error", "This meeting isn't live.");
  if (!(await isAudienceMember(s, studentId))) return fail("not_found", "That person isn't in this meeting.");
  const kind = s.meetingKind!;

  try {
    switch (action as ModerationAction) {
      case "allow_audio":
        await livekit.setPublishLevel(cfg, s.id, studentId, kind, "audio");
        break;
      case "allow_video":
        await livekit.setPublishLevel(cfg, s.id, studentId, kind, "audio_video");
        break;
      case "revoke":
        await livekit.setPublishLevel(cfg, s.id, studentId, kind, "none");
        break;
      case "mute":
        await livekit.muteAudio(cfg, s.id, studentId);
        break;
      case "lower_hand":
        await livekit.setHandRaised(cfg, s.id, studentId, false);
        break;
      case "remove": {
        const actor = await getActor();
        const supabase = await createClient();
        const { error } = await supabase.from("live_meeting_removals").upsert({ session_id: s.id, user_id: studentId, removed_by: actor!.id }, { onConflict: "session_id,user_id", ignoreDuplicates: true });
        if (error) return meetingDbError(error, "We couldn't remove that student. Please try again.");
        await livekit.removeFromRoom(cfg, s.id, studentId);
        break;
      }
    }
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return fail("not_found", "That student isn't in the room right now.");
    console.error(`[meetings] moderation failed: ${livekit.describeProviderError(error)}`);
    return fail("server_error", PROVIDER_DOWN);
  }
  return { ok: true, data: null };
}

// ---- Host: whole-room controls ----------------------------------------------------

export async function muteAllStudents(id: string): Promise<ServiceResult<{ muted: number }>> {
  const live = await myLiveMeeting(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  const { session: s, cfg } = live.data;
  if (s.status !== "scheduled" || !s.actualStartedAt || s.actualEndedAt) return fail("validation_error", "This meeting isn't live.");
  try {
    const people = await livekit.connectedIdentities(cfg, s.id);
    const students = [];
    for (const p of people) if (await isAudienceMember(s, p.identity)) students.push(p.identity);
    await Promise.all(students.map((identity) => livekit.muteAudio(cfg, s.id, identity).catch(() => undefined)));
    return { ok: true, data: { muted: students.length } };
  } catch (error) {
    console.error(`[meetings] mute all failed: ${(error as Error)?.message ?? "unknown"}`);
    return fail("server_error", PROVIDER_DOWN);
  }
}

export async function lowerAllHands(id: string): Promise<ServiceResult<{ lowered: number }>> {
  const live = await myLiveMeeting(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  const { session: s, cfg } = live.data;
  try {
    const raised = (await livekit.connectedIdentities(cfg, s.id)).filter((p) => p.handRaised);
    await Promise.all(raised.map((p) => livekit.setHandRaised(cfg, s.id, p.identity, false).catch(() => undefined)));
    return { ok: true, data: { lowered: raised.length } };
  } catch (error) {
    console.error(`[meetings] lower hands failed: ${(error as Error)?.message ?? "unknown"}`);
    return fail("server_error", PROVIDER_DOWN);
  }
}

// ---- Everyone in the meeting: chat, reactions, raise hand ------------------------

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
}

// Someone who may take part right now: the meeting is live and they are its
// host mentor, an admin of its academy, or a (not removed) student of it.
async function liveParticipant(id: string): Promise<ServiceResult<{ actor: Actor; session: SessionRecord; cfg: livekit.LiveKitConfig }>> {
  const actor = await getActor();
  if (!actor) return fail("unauthorized", "Please sign in again.");
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const s = found.data;
  if (s.status !== "scheduled" || !s.actualStartedAt || s.actualEndedAt || Date.now() >= Date.parse(s.endsAt)) return fail("validation_error", "This meeting isn't live.");
  if (actor.profile.role === "student" && (await isRemoved(s.id, actor.id))) return fail("not_found", NOT_FOUND);
  const cfg = livekit.liveKitConfig();
  if (!cfg) return fail("not_set_up", NOT_CONFIGURED);
  return { ok: true, data: { actor, session: s, cfg } };
}

const toMessage = (r: Record<string, unknown>): ChatMessage => ({
  id: String(r.id),
  senderId: String(r.sender_id),
  senderName: typeof r.sender_name === "string" ? r.sender_name : typeof r.full_name === "string" && r.full_name ? r.full_name : "Participant",
  body: String(r.body),
  at: String(r.created_at),
});

// History for this meeting (RLS: live_messages_read), oldest first.
export async function listMessages(id: string): Promise<ServiceResult<ChatMessage[]>> {
  const actor = await getActor();
  if (!actor) return fail("unauthorized", "Please sign in again.");
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_meeting_messages")
    .select("id, sender_id, body, created_at, sender:profiles!live_meeting_messages_sender_id_fkey(full_name)")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return mapDbError(error, "We couldn't load the chat. Please try again.");
  return {
    ok: true,
    data: (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const sender = (Array.isArray(row.sender) ? row.sender[0] : row.sender) as Record<string, unknown> | null;
      return toMessage({ ...row, full_name: sender?.full_name });
    }),
  };
}

// Stored first (post_live_meeting_message checks membership, live state and
// rate), then broadcast. If the broadcast fails the message is still saved and
// everyone gets it on their next history load.
export async function sendMessage(id: string, body: unknown): Promise<ServiceResult<ChatMessage>> {
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < 1 || text.length > 1000) return fail("validation_error", "Messages are 1–1,000 characters.");
  const live = await liveParticipant(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_live_meeting_message", { p_session: id, p_body: text });
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  if (error || !row) return error?.code === "MT010" ? fail("validation_error", "You're sending messages very fast. Wait a moment.") : meetingDbError(error ?? {}, "We couldn't send your message. Please try again.");
  const message = toMessage(row);
  await livekit
    .broadcast(live.data.cfg, id, { type: "chat", ...message })
    .catch((e: Error) => console.error(`[meetings] chat broadcast failed: ${e?.message ?? "unknown"}`));
  return { ok: true, data: message };
}

export const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉", "✅", "❌", "❓", "🙏", "💡", "☕"] as const;
const recentReactions = new Map<string, number[]>();

export async function sendReaction(id: string, emoji: unknown): Promise<ServiceResult<null>> {
  if (!REACTIONS.includes(emoji as (typeof REACTIONS)[number])) return fail("validation_error", "Choose one of the reactions.");
  const live = await liveParticipant(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  const { actor, cfg } = live.data;
  const now = Date.now();
  const mine = (recentReactions.get(actor.id) ?? []).filter((t) => now - t < 10_000);
  if (mine.length >= 10) return fail("validation_error", "That's a lot of reactions. Wait a moment.");
  recentReactions.set(actor.id, [...mine, now]);
  try {
    await livekit.broadcast(cfg, id, { type: "reaction", senderId: actor.id, senderName: actor.profile.fullName?.trim() || "Participant", emoji: emoji as string, at: new Date(now).toISOString() });
    return { ok: true, data: null };
  } catch (error) {
    console.error(`[meetings] reaction failed: ${(error as Error)?.message ?? "unknown"}`);
    return fail("server_error", PROVIDER_DOWN);
  }
}

// Raise or lower your own hand (shown to everyone; hosts can lower it).
export async function setMyHand(id: string, raised: unknown): Promise<ServiceResult<null>> {
  const live = await liveParticipant(id);
  if (!live.ok || !live.data) return live as ServiceResult<never>;
  try {
    await livekit.setHandRaised(live.data.cfg, id, live.data.actor.id, raised === true);
    return { ok: true, data: null };
  } catch (error) {
    if ((error as { status?: number })?.status === 404) return fail("validation_error", "Join the meeting first.");
    console.error(`[meetings] raise hand failed: ${(error as Error)?.message ?? "unknown"}`);
    return fail("server_error", PROVIDER_DOWN);
  }
}

// ---- Attendance -------------------------------------------------------------------

export interface MeetingAttendanceRow {
  userId: string;
  name: string;
  role: "mentor" | "admin" | "student";
  firstJoinedAt: string;
  lastLeftAt: string | null; // null = still in the room
  minutes: number; // eligible connected time (union of visits inside the scheduled window)
  requiredMinutes: number; // 75% of the scheduled duration
  joins: number;
  // Students only, once the meeting has ended: the 75% rule's result, or the
  // mentor's own mark (which is never overwritten).
  status: "present" | "absent" | "excused" | null;
  markedByMentor: boolean;
}

// Connected time from LiveKit's signed webhooks, computed in the database
// (live_meeting_attendance_summary, 0025). The meeting's mentor and their
// academy admin can read it.
export async function getMeetingAttendance(id: string): Promise<ServiceResult<MeetingAttendanceRow[]>> {
  const actor = await getActor();
  if (!actor || (actor.profile.role !== "mentor" && actor.profile.role !== "academy_admin")) return fail("unauthorized", "Only staff can view meeting attendance.");
  // Same scope as joining: the mentor's own meeting, or one in the admin's academy.
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const supabase = await createClient();
  const mentorId = found.data.mentorId;
  const rows = await supabase.rpc("live_meeting_attendance_summary", { p_session: id });
  if (rows.error) return mapDbError(rows.error, "We couldn't load attendance. Please try again.");
  const list = (rows.data ?? []) as Record<string, unknown>[];
  const ids = list.map((r) => String(r.user_id));
  const names = new Map<string, string>();
  const admins = new Set<string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email, role").in("id", ids);
    for (const p of (data ?? []) as Record<string, unknown>[]) {
      names.set(p.id as string, (p.full_name as string) || (p.email as string) || "Participant");
      if (p.role === "academy_admin") admins.add(p.id as string);
    }
  }
  return {
    ok: true,
    data: list
      .map((r): MeetingAttendanceRow => {
        const userId = String(r.user_id);
        const role = userId === mentorId ? "mentor" : admins.has(userId) ? "admin" : "student";
        return {
          userId,
          name: names.get(userId) ?? "Participant",
          role,
          firstJoinedAt: String(r.first_joined_at),
          lastLeftAt: r.still_connected === true ? null : typeof r.last_left_at === "string" ? r.last_left_at : null,
          minutes: Math.floor(Number(r.connected_seconds ?? 0) / 60),
          requiredMinutes: Math.ceil(Number(r.required_seconds ?? 0) / 60),
          joins: Number(r.joins ?? 1),
          status: role === "student" && (r.status === "present" || r.status === "absent" || r.status === "excused") ? r.status : null,
          markedByMentor: r.marked_by_mentor === true,
        };
      })
      .sort((a, b) => Number(b.role !== "student") - Number(a.role !== "student") || a.name.localeCompare(b.name)),
  };
}
