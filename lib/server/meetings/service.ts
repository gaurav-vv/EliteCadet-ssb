// Live meeting rooms (T094, specs.md §8a.4h): who may join, when, with which
// media permissions, and the mentor's controls. Everything is decided here on
// the server from the signed-in account and the server clock; the database
// (0022_live_meetings.sql) enforces the same rules again.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import * as livekit from "@/lib/server/meetings/livekit";
import { meetingDbError } from "@/lib/server/meetings/errors";
import { SESSION_COLUMNS, toSession } from "@/lib/server/sessions/service";
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
  return { ok: true, data: session };
}

function participantRole(actor: Actor): livekit.ParticipantRole {
  return actor.profile.role === "mentor" ? "mentor" : actor.profile.role === "academy_admin" ? "admin" : "student";
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
  viewer: { id: string; role: livekit.ParticipantRole };
  join: JoinState;
  opensAt: string;
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
  return { ok: true, data: { session: s, viewer: { id: actor.id, role }, join, opensAt } };
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
      console.error(`[meetings] create room failed: ${(error as Error)?.message ?? "unknown"}`);
      return fail("server_error", PROVIDER_DOWN);
    }
  }

  const actor = await getActor();
  const name = actor?.profile.fullName?.trim() || (viewer.role === "mentor" ? "Mentor" : viewer.role === "admin" ? "Academy admin" : "Student");
  try {
    const token = await livekit.createJoinToken(cfg, { sessionId: s.id, userId: viewer.id, name, role: viewer.role, kind: s.meetingKind! });
    return { ok: true, data: { serverUrl: cfg.url, token, role: viewer.role, kind: s.meetingKind!, endsAt: s.endsAt } };
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

export async function endMeeting(id: string): Promise<ServiceResult<null>> {
  const actor = await hostActor();
  if (!actor) return fail("unauthorized", "Only the meeting's mentor or academy admin can end it.");
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  if (!found.data.actualStartedAt) return fail("validation_error", "This meeting hasn't started. Cancel it instead if it isn't happening.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_live_meeting", { p_session: id });
  if (error) return meetingDbError(error, "We couldn't end the meeting. Please try again.");
  const cfg = livekit.liveKitConfig();
  if (cfg) {
    // The record is already final; a provider hiccup only delays the hang-up.
    await livekit.closeRoom(cfg, id).catch((e: Error) => console.error(`[meetings] close room failed: ${e?.message ?? "unknown"}`));
  }
  return { ok: true, data: null };
}

export type ModerationAction = "allow_audio" | "allow_video" | "revoke" | "mute" | "remove";
const ACTIONS: ModerationAction[] = ["allow_audio", "allow_video", "revoke", "mute", "remove"];

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
    console.error(`[meetings] moderation failed: ${(error as Error)?.message ?? "unknown"}`);
    return fail("server_error", PROVIDER_DOWN);
  }
  return { ok: true, data: null };
}

// ---- Attendance -------------------------------------------------------------------

export interface MeetingAttendanceRow {
  userId: string;
  name: string;
  role: "mentor" | "admin" | "student";
  firstJoinedAt: string;
  lastLeftAt: string | null; // null = still in the room
  minutes: number;
  joins: number;
}

// From LiveKit's signed webhooks (record_live_meeting_event). The mentor of the
// meeting and their academy admin can read it (RLS: live_attendance_read).
export async function getMeetingAttendance(id: string): Promise<ServiceResult<MeetingAttendanceRow[]>> {
  const actor = await getActor();
  if (!actor || (actor.profile.role !== "mentor" && actor.profile.role !== "academy_admin")) return fail("unauthorized", "Only staff can view meeting attendance.");
  // Same scope as joining: the mentor's own meeting, or one in the admin's academy.
  const found = await loadMeeting(actor, id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  const supabase = await createClient();
  const mentorId = found.data.mentorId;
  const rows = await supabase.from("live_meeting_attendance").select("user_id, joined_at, left_at").eq("session_id", id).order("joined_at");
  if (rows.error) return mapDbError(rows.error, "We couldn't load attendance. Please try again.");
  const ids = [...new Set((rows.data ?? []).map((r) => r.user_id as string))];
  const names = new Map<string, string>();
  const admins = new Set<string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email, role").in("id", ids);
    for (const p of (data ?? []) as Record<string, unknown>[]) {
      names.set(p.id as string, (p.full_name as string) || (p.email as string) || "Participant");
      if (p.role === "academy_admin") admins.add(p.id as string);
    }
  }

  const now = Date.now();
  const byUser = new Map<string, MeetingAttendanceRow>();
  for (const r of (rows.data ?? []) as { user_id: string; joined_at: string; left_at: string | null }[]) {
    const end = r.left_at ? Date.parse(r.left_at) : now;
    const minutes = Math.max(0, (end - Date.parse(r.joined_at)) / 60_000);
    const cur = byUser.get(r.user_id);
    if (!cur) {
      byUser.set(r.user_id, { userId: r.user_id, name: names.get(r.user_id) ?? "Participant", role: r.user_id === mentorId ? "mentor" : admins.has(r.user_id) ? "admin" : "student", firstJoinedAt: r.joined_at, lastLeftAt: r.left_at, minutes, joins: 1 });
    } else {
      cur.minutes += minutes;
      cur.joins += 1;
      cur.lastLeftAt = cur.lastLeftAt === null || r.left_at === null ? null : r.left_at > cur.lastLeftAt ? r.left_at : cur.lastLeftAt;
    }
  }
  return { ok: true, data: [...byUser.values()].map((r) => ({ ...r, minutes: Math.round(r.minutes) })).sort((a, b) => Number(b.role !== "student") - Number(a.role !== "student") || a.name.localeCompare(b.name)) };
}
