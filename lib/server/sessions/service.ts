// Sessions + availability service (specs.md §8a.4b). The mentor/student/
// academy always comes from the session; RLS (can_see_session, mentor write
// policies, the overlap exclusion constraint) enforces the same rules in the
// database. Times are UTC here; pages render them in IST.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import { parseSessionFilter, validateSessionInput, validateSlot, withinAvailability, type SessionFieldErrors } from "@/lib/server/sessions/validation";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { DbError } from "@/lib/server/users/repository";
import type { AvailabilitySlot, SessionFilter, SessionInput, SessionMode, SessionRecord, SessionState } from "@/types/sessions";

type Result<T> = ServiceResult<T> & { fieldErrors?: SessionFieldErrors; outsideAvailability?: boolean };

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that session.";

const COLUMNS =
  "id, batch_id, mentor_id, title, description, starts_at, ends_at, mode, meeting_url, location, for_whole_batch, status, cancel_reason, batch:batches(name), mentor:profiles!sessions_mentor_id_fkey(full_name), session_participants(student_id)";

export function toSession(row: unknown): SessionRecord | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.batch_id !== "string" || typeof r.mentor_id !== "string" || typeof r.title !== "string") return null;
  if (typeof r.starts_at !== "string" || typeof r.ends_at !== "string") return null;
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | null | undefined;
  const parts = Array.isArray(r.session_participants) ? r.session_participants : [];
  return {
    id: r.id,
    batchId: r.batch_id,
    batchName: typeof one(r.batch)?.name === "string" ? (one(r.batch)!.name as string) : null,
    mentorId: r.mentor_id,
    mentorName: typeof one(r.mentor)?.full_name === "string" ? (one(r.mentor)!.full_name as string) : null,
    title: r.title,
    description: typeof r.description === "string" ? r.description : null,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    mode: (r.mode === "offline" ? "offline" : "online") as SessionMode,
    meetingUrl: typeof r.meeting_url === "string" ? r.meeting_url : null,
    location: typeof r.location === "string" ? r.location : null,
    forWholeBatch: r.for_whole_batch !== false,
    status: (["scheduled", "completed", "cancelled"].includes(r.status as string) ? r.status : "scheduled") as SessionState,
    cancelReason: typeof r.cancel_reason === "string" ? r.cancel_reason : null,
    participantIds: parts.flatMap((p: unknown) => {
      const o = typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {};
      return typeof o.student_id === "string" ? [o.student_id] : [];
    }),
  };
}

function sessionDbError(error: DbError, fallback: string): ServiceResult<never> {
  if (error.code === "23P01") return fail("validation_error", "This overlaps another session you have scheduled. Pick a different time.");
  if (error.code === "23514") return fail("validation_error", "Some details aren't valid for this session (time, link/location, or students outside the batch).");
  return mapDbError(error, fallback);
}

// Query helper: one listing shape for every role. RLS decides visibility;
// `scope` narrows it further to the caller's own view.
async function listSessions(scope: { mentorId?: string; batchId?: string; academyId?: string }, filter: SessionFilter, nowIso: string): Promise<ServiceResult<SessionRecord[]>> {
  const supabase = await createClient();
  let query = supabase.from("sessions").select(COLUMNS);
  if (scope.mentorId) query = query.eq("mentor_id", scope.mentorId);
  if (scope.batchId) query = query.eq("batch_id", scope.batchId);
  if (scope.academyId) query = query.eq("academy_id", scope.academyId);
  if (filter === "cancelled") query = query.eq("status", "cancelled").order("starts_at", { ascending: false });
  else if (filter === "past") query = query.neq("status", "cancelled").lt("ends_at", nowIso).order("starts_at", { ascending: false });
  else query = query.eq("status", "scheduled").gte("ends_at", nowIso).order("starts_at", { ascending: true });
  const { data, error } = await query.limit(200);
  if (error) return mapDbError(error, "We couldn't load sessions. Please try again.");
  return { ok: true, data: (data ?? []).map(toSession).filter((s): s is SessionRecord => s !== null) };
}

async function mentor(): Promise<Actor | null> {
  const actor = await getActor();
  return actor && actor.profile.role === "mentor" ? actor : null;
}

// ---- Mentor ------------------------------------------------------------------

export async function getMySessions(filter: unknown, nowIso: string): Promise<ServiceResult<SessionRecord[]>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can view their sessions.");
  return listSessions({ mentorId: me.id }, parseSessionFilter(filter), nowIso);
}

export interface ScheduleFormData {
  batches: { id: string; name: string; students: { id: string; name: string }[] }[];
  availability: AvailabilitySlot[];
}

export async function getScheduleFormData(): Promise<ServiceResult<ScheduleFormData>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can schedule sessions.");
  const batches = await findMyBatchIds(me.id);
  if (batches.error) return mapDbError(batches.error);
  const supabase = await createClient();
  const ids = batches.data.map((b) => b.id);
  const [students, slots] = await Promise.all([
    ids.length > 0 ? supabase.from("academy_students").select("id, full_name, email, batch_id").in("batch_id", ids).order("full_name", { ascending: true }) : Promise.resolve({ data: [], error: null }),
    getMyAvailability(),
  ]);
  if (students.error) return mapDbError(students.error);
  const byBatch = new Map<string, { id: string; name: string }[]>();
  for (const row of (students.data ?? []) as Record<string, unknown>[]) {
    if (typeof row.id !== "string" || typeof row.batch_id !== "string") continue;
    const list = byBatch.get(row.batch_id) ?? [];
    list.push({ id: row.id, name: (typeof row.full_name === "string" && row.full_name) || (typeof row.email === "string" ? row.email : "Unnamed student") });
    byBatch.set(row.batch_id, list);
  }
  return {
    ok: true,
    data: { batches: batches.data.map((b) => ({ ...b, students: byBatch.get(b.id) ?? [] })), availability: slots.data ?? [] },
  };
}

export async function getMySession(id: string): Promise<ServiceResult<SessionRecord>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can open their sessions.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(COLUMNS).eq("id", id).eq("mentor_id", me.id).maybeSingle();
  if (error) return mapDbError(error);
  const session = data ? toSession(data) : null;
  return session ? { ok: true, data: session } : fail("not_found", NOT_FOUND);
}

// For the session page: the session plus whether it has started (so the page
// stays a pure render; "now" is read here, on the server, per request).
export async function getMySessionView(id: string): Promise<ServiceResult<{ session: SessionRecord; started: boolean }>> {
  const found = await getMySession(id);
  if (!found.ok || !found.data) return found as ServiceResult<never>;
  return { ok: true, data: { session: found.data, started: Date.parse(found.data.startsAt) <= Date.now() } };
}

async function writeParticipants(sessionId: string, ids: string[]): Promise<DbError | null> {
  const supabase = await createClient();
  const { error: delError } = await supabase.from("session_participants").delete().eq("session_id", sessionId);
  if (delError) return delError;
  if (ids.length === 0) return null;
  const { error } = await supabase.from("session_participants").insert(ids.map((student_id) => ({ session_id: sessionId, student_id })));
  return error;
}

export async function scheduleSession(input: Partial<Record<keyof SessionInput, unknown>>, nowIso: string): Promise<Result<{ id: string }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can schedule sessions.");
  const parsed = validateSessionInput(input, nowIso);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const form = await getScheduleFormData();
  if (!form.ok || !form.data) return form as ServiceResult<never>;
  const batch = form.data.batches.find((b) => b.id === parsed.value.batch_id);
  if (!batch) return { ...fail("validation_error", "You can only schedule for batches you teach."), fieldErrors: { batchId: "Choose one of your batches." } };
  const allowed = new Set(batch.students.map((s) => s.id));
  if (parsed.value.participantIds.some((p) => !allowed.has(p))) return { ...fail("validation_error", "Pick students from this batch."), fieldErrors: { participantIds: "Pick students from this batch." } };

  const { participantIds, ...row } = parsed.value;
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").insert({ ...row, mentor_id: me.id, created_by: me.id }).select("id").single();
  if (error || !data) return sessionDbError(error ?? {}, "We couldn't schedule the session. Please try again.");
  const partError = await writeParticipants(data.id as string, participantIds);
  if (partError) return sessionDbError(partError, "The session was saved, but we couldn't add the selected students. Open it and try again.");
  return { ok: true, data: { id: data.id as string }, outsideAvailability: !withinAvailability(form.data.availability, row.starts_at, row.ends_at) };
}

export async function updateSession(id: string, input: Partial<Record<keyof SessionInput, unknown>>, nowIso: string): Promise<Result<null>> {
  const current = await getMySession(id);
  if (!current.ok || !current.data) return current as ServiceResult<never>;
  if (current.data.status !== "scheduled") return fail("validation_error", "Only a scheduled session can be edited.");
  const parsed = validateSessionInput(input, nowIso);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const form = await getScheduleFormData();
  if (!form.ok || !form.data) return form as ServiceResult<never>;
  const batch = form.data.batches.find((b) => b.id === parsed.value.batch_id);
  if (!batch) return { ...fail("validation_error", "You can only schedule for batches you teach."), fieldErrors: { batchId: "Choose one of your batches." } };
  const allowed = new Set(batch.students.map((s) => s.id));
  if (parsed.value.participantIds.some((p) => !allowed.has(p))) return { ...fail("validation_error", "Pick students from this batch."), fieldErrors: { participantIds: "Pick students from this batch." } };

  const { participantIds, ...row } = parsed.value;
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").update(row).eq("id", id).eq("mentor_id", current.data.mentorId).eq("status", "scheduled").select("id");
  if (error) return sessionDbError(error, "We couldn't save the session. Please try again.");
  if (!data || data.length === 0) return fail("not_found", NOT_FOUND);
  const partError = await writeParticipants(id, participantIds);
  if (partError) return sessionDbError(partError, "We couldn't update the selected students. Please try again.");
  return { ok: true, data: null, outsideAvailability: !withinAvailability(form.data.availability, row.starts_at, row.ends_at) };
}

export async function cancelSession(id: string, reason: unknown): Promise<ServiceResult<null>> {
  const current = await getMySession(id);
  if (!current.ok || !current.data) return current as ServiceResult<never>;
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3 || why.length > 300) return fail("validation_error", "Give a short reason (3–300 characters). Your students will see it.");
  if (current.data.status !== "scheduled") return fail("validation_error", "Only a scheduled session can be cancelled.");
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").update({ status: "cancelled", cancel_reason: why }).eq("id", id).eq("status", "scheduled");
  if (error) return mapDbError(error);
  return { ok: true, data: null };
}

export async function completeSession(id: string, nowIso: string): Promise<ServiceResult<null>> {
  const current = await getMySession(id);
  if (!current.ok || !current.data) return current as ServiceResult<never>;
  if (current.data.status !== "scheduled") return fail("validation_error", "Only a scheduled session can be marked completed.");
  if (Date.parse(current.data.startsAt) > Date.parse(nowIso)) return fail("validation_error", "You can mark it completed once it has started.");
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").update({ status: "completed" }).eq("id", id).eq("status", "scheduled");
  if (error) return mapDbError(error);
  return { ok: true, data: null };
}

// ---- Availability ----------------------------------------------------------

export async function getMyAvailability(): Promise<ServiceResult<AvailabilitySlot[]>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor has availability.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentor_availability").select("id, weekday, start_time, end_time").eq("mentor_id", me.id).order("weekday").order("start_time");
  if (error) return mapDbError(error, "We couldn't load your availability. Please try again.");
  return {
    ok: true,
    data: (data ?? []).flatMap((r) =>
      typeof r.id === "string" ? [{ id: r.id, weekday: Number(r.weekday), startTime: String(r.start_time).slice(0, 5), endTime: String(r.end_time).slice(0, 5) }] : [],
    ),
  };
}

export async function addAvailability(input: { weekday?: unknown; startTime?: unknown; endTime?: unknown }): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor has availability.");
  const parsed = validateSlot(input);
  if (!parsed.ok) return fail("validation_error", parsed.message);
  const existing = await getMyAvailability();
  const clash = (existing.data ?? []).some((s) => s.weekday === parsed.value.weekday && parsed.value.start_time < s.endTime && s.startTime < parsed.value.end_time);
  if (clash) return fail("validation_error", "That overlaps a slot you already have on that day.");
  const supabase = await createClient();
  const { error } = await supabase.from("mentor_availability").insert({ ...parsed.value, mentor_id: me.id });
  if (error) return mapDbError(error, "We couldn't save that slot. Please try again.");
  return { ok: true, data: null };
}

export async function removeAvailability(id: string): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor has availability.");
  if (!isUuid(id)) return fail("not_found", "That slot no longer exists.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentor_availability").delete().eq("id", id).eq("mentor_id", me.id).select("id");
  if (error) return mapDbError(error);
  if (!data || data.length === 0) return fail("not_found", "That slot no longer exists.");
  return { ok: true, data: null };
}

// ---- Student / Academy admin ----------------------------------------------------

export async function getMyStudentSessions(filter: unknown, nowIso: string): Promise<ServiceResult<SessionRecord[]>> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "student") return fail("unauthorized", "Only a student can view their sessions.");
  // No extra scope on purpose: RLS (can_see_session) returns exactly the
  // sessions for this student's batch or the ones they were selected for.
  return listSessions({}, parseSessionFilter(filter), nowIso);
}

export async function getAcademySessions(filter: unknown, nowIso: string, batchId?: string): Promise<ServiceResult<SessionRecord[]>> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "academy_admin" || !actor.profile.academyId) return fail("unauthorized", "Only an academy admin can view academy sessions.");
  return listSessions({ academyId: actor.profile.academyId, batchId: batchId && isUuid(batchId) ? batchId : undefined }, parseSessionFilter(filter), nowIso);
}
