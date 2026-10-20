// Contract for sessions + availability (Phase 6, T085) — specs.md §8a.4b.
// Backed by public.sessions / session_participants / mentor_availability
// (supabase/migrations/0010_sessions.sql). Times are UTC ISO strings.
// Live meeting rooms (T094, 0022_live_meetings.sql) are sessions with a
// meetingKind: one-to-one or the whole batch, in a LiveKit room.

export type SessionMode = "online" | "offline";
export type SessionState = "scheduled" | "completed" | "cancelled";
export type MeetingKind = "one_to_one" | "batch";
// What a viewer sees: "live" is a scheduled meeting the mentor has started.
export type SessionDisplayState = SessionState | "live";

// Rules shared by the form, the server and the database (0022).
export const MEETING_MIN_MINUTES = 15;
export const MEETING_MAX_MINUTES = 120;
export const MEETING_DAILY_LIMIT_MINUTES = 120;
export const MEETING_BATCH_MAX_STUDENTS = 100;
export const MEETING_OPENS_MINUTES_BEFORE = 15;
export const MEETING_MAX_DAYS_AHEAD = 90;
export type SessionFilter = "upcoming" | "past" | "cancelled";

export interface SessionRecord {
  id: string;
  batchId: string;
  batchName: string | null;
  mentorId: string;
  mentorName: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  mode: SessionMode;
  meetingUrl: string | null;
  location: string | null;
  forWholeBatch: boolean;
  status: SessionState;
  cancelReason: string | null;
  participantIds: string[];
  meetingKind: MeetingKind | null;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  endedEarly: boolean;
}

export function sessionDisplayState(s: Pick<SessionRecord, "status" | "meetingKind" | "actualStartedAt" | "actualEndedAt">): SessionDisplayState {
  if (s.status === "scheduled" && s.meetingKind && s.actualStartedAt && !s.actualEndedAt) return "live";
  return s.status;
}

export interface SessionInput {
  batchId: string;
  title: string;
  description: string;
  date: string; // yyyy-mm-dd, in IST
  startTime: string; // HH:MM, IST
  endTime: string; // HH:MM, IST
  mode: string; // "room" (live meeting), "online" (pasted link) or "offline"
  meetingUrl: string;
  location: string;
  forWholeBatch: boolean;
  participantIds: string[];
  studentId: string; // one-to-one live meeting
  mentorId?: string; // academy admin scheduling: the host mentor
}

export interface AvailabilitySlot {
  id: string;
  weekday: number; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
