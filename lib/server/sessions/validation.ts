// Session + availability rules — pure (tests/unit/lib/sessions-validation.test.ts).
// Times are entered and shown in IST (Asia/Kolkata, UTC+05:30, no DST) and
// stored as UTC.

import type { AvailabilitySlot, SessionFilter, SessionInput, SessionMode } from "@/types/sessions";

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MINUTES = 8 * 60;

// "2026-10-15" + "18:30" (IST) → "2026-10-15T13:00:00.000Z". Null if invalid.
export function istToUtcIso(date: string, time: string): string | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MINUTES * 60_000).toISOString();
}

// UTC ISO → { date: "2026-10-15", time: "18:30" } in IST (for edit forms).
export function utcIsoToIst(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + IST_OFFSET_MINUTES * 60_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

const DAY_FMT = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

export function formatIstDay(iso: string): string {
  return DAY_FMT.format(new Date(iso));
}

export function formatIstTimeRange(startIso: string, endIso: string): string {
  return `${TIME_FMT.format(new Date(startIso))} – ${TIME_FMT.format(new Date(endIso))} IST`;
}

// IST calendar day key for grouping an agenda: "2026-10-15".
export function istDayKey(iso: string): string {
  return utcIsoToIst(iso).date;
}

export type SessionFieldErrors = Partial<Record<keyof SessionInput, string>>;

export interface CleanSession {
  batch_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  mode: SessionMode;
  meeting_url: string | null;
  location: string | null;
  for_whole_batch: boolean;
  participantIds: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// `nowIso` makes "in the past" testable.
export function validateSessionInput(input: Partial<Record<keyof SessionInput, unknown>>, nowIso: string): { ok: true; value: CleanSession } | { ok: false; errors: SessionFieldErrors } {
  const errors: SessionFieldErrors = {};
  const batchId = str(input.batchId);
  const title = str(input.title).replace(/\s+/g, " ");
  const description = str(input.description);
  const mode = input.mode === "online" || input.mode === "offline" ? input.mode : null;
  const meetingUrl = str(input.meetingUrl);
  const location = str(input.location);
  const forWholeBatch = input.forWholeBatch !== false;
  const participantIds = Array.isArray(input.participantIds) ? [...new Set(input.participantIds.filter((p): p is string => typeof p === "string"))] : [];

  if (!UUID_RE.test(batchId)) errors.batchId = "Choose one of your batches.";
  if (title.length < 3 || title.length > 140) errors.title = "Title must be 3–140 characters.";
  if (description.length > 2000) errors.description = "Keep the description under 2,000 characters.";

  const startsAt = istToUtcIso(str(input.date), str(input.startTime));
  const endsAt = istToUtcIso(str(input.date), str(input.endTime));
  if (!startsAt) errors.date = "Enter a valid date and start time.";
  if (!endsAt) errors.endTime = "Enter a valid end time.";
  if (startsAt && endsAt) {
    const minutes = (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000;
    if (minutes <= 0) errors.endTime = "End must be after the start.";
    else if (minutes > MAX_MINUTES) errors.endTime = "Sessions can be at most 8 hours.";
    if (Date.parse(startsAt) < Date.parse(nowIso)) errors.date = "Choose a time in the future.";
  }

  if (!mode) errors.mode = "Choose online or offline.";
  if (mode === "online") {
    let ok = false;
    try {
      ok = new URL(meetingUrl).protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok || meetingUrl.length > 500) errors.meetingUrl = "Add the https:// meeting link.";
  }
  if (mode === "offline" && (location.length < 2 || location.length > 200)) errors.location = "Add where it happens.";
  if (!forWholeBatch) {
    if (participantIds.length === 0) errors.participantIds = "Pick at least one student, or invite the whole batch.";
    else if (participantIds.some((p) => !UUID_RE.test(p))) errors.participantIds = "Pick students from the list.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      batch_id: batchId,
      title,
      description: description || null,
      starts_at: startsAt!,
      ends_at: endsAt!,
      mode: mode!,
      meeting_url: mode === "online" ? meetingUrl : null,
      location: mode === "offline" ? location : null,
      for_whole_batch: forWholeBatch,
      participantIds: forWholeBatch ? [] : participantIds,
    },
  };
}

export function parseSessionFilter(value: unknown): SessionFilter {
  return value === "past" || value === "cancelled" ? value : "upcoming";
}

export function validateSlot(input: { weekday?: unknown; startTime?: unknown; endTime?: unknown }): { ok: true; value: { weekday: number; start_time: string; end_time: string } } | { ok: false; message: string } {
  const weekday = Number(input.weekday);
  const start = str(input.startTime);
  const end = str(input.endTime);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, message: "Choose a day." };
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return { ok: false, message: "Enter valid start and end times." };
  if (end <= start) return { ok: false, message: "End must be after the start." };
  return { ok: true, value: { weekday, start_time: start, end_time: end } };
}

// Is [start, end) (UTC) inside one of the mentor's weekly slots, in IST?
export function withinAvailability(slots: AvailabilitySlot[], startIso: string, endIso: string): boolean {
  if (slots.length === 0) return true; // no availability set = no constraint shown
  const s = utcIsoToIst(startIso);
  const e = utcIsoToIst(endIso);
  if (s.date !== e.date) return false;
  const weekday = new Date(`${s.date}T00:00:00Z`).getUTCDay();
  return slots.some((slot) => slot.weekday === weekday && slot.startTime <= s.time && e.time <= slot.endTime);
}
