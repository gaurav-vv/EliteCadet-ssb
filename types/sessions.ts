// Contract for sessions + availability (Phase 6, T085) — specs.md §8a.4b.
// Backed by public.sessions / session_participants / mentor_availability
// (supabase/migrations/0010_sessions.sql). Times are UTC ISO strings.

export type SessionMode = "online" | "offline";
export type SessionState = "scheduled" | "completed" | "cancelled";
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
}

export interface SessionInput {
  batchId: string;
  title: string;
  description: string;
  date: string; // yyyy-mm-dd, in IST
  startTime: string; // HH:MM, IST
  endTime: string; // HH:MM, IST
  mode: string;
  meetingUrl: string;
  location: string;
  forWholeBatch: boolean;
  participantIds: string[];
}

export interface AvailabilitySlot {
  id: string;
  weekday: number; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
