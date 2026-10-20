// Database rule violations from 0022_live_meetings.sql → plain language.
// Shared by the sessions and meetings services. Never shows SQL to users.

import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { MEETING_BATCH_MAX_STUDENTS, MEETING_DAILY_LIMIT_MINUTES, MEETING_MAX_DAYS_AHEAD, MEETING_OPENS_MINUTES_BEFORE } from "@/types/sessions";

const fail = <T>(code: "validation_error" | "not_found", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

export interface MeetingDbError {
  code?: string;
  message?: string;
  details?: string;
}

const DAY_FMT = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

// Database rule violations from 0022 → plain language. Never shows SQL.
export function meetingDbError<T>(error: MeetingDbError, fallback: string): ServiceResult<T> {
  switch (error.code) {
    case "MT001": {
      const detail = Object.fromEntries((error.details ?? "").split(";").map((kv) => kv.split("=") as [string, string]));
      const used = Number(detail.used);
      const day = /^\d{4}-\d{2}-\d{2}$/.test(detail.day ?? "") ? DAY_FMT.format(new Date(`${detail.day}T00:00:00Z`)) : "that day";
      const left = Number.isFinite(used) ? Math.max(0, MEETING_DAILY_LIMIT_MINUTES - used) : null;
      return fail(
        "validation_error",
        left === null
          ? `This goes over your ${MEETING_DAILY_LIMIT_MINUTES}-minute daily meeting limit.`
          : `You already have ${used} minutes of meetings on ${day}. Each mentor can host at most ${MEETING_DAILY_LIMIT_MINUTES} minutes a day, so ${left} minutes are left that day.`,
      );
    }
    case "MT002":
      return fail("validation_error", `Batch meetings allow at most ${MEETING_BATCH_MAX_STUDENTS} enrolled students. Ask your academy admin to split the batch.`);
    case "MT003":
      return fail("validation_error", "Pick one of your batches, or one student from it.");
    case "MT009":
      return fail("validation_error", "The host must be an active mentor assigned to this batch.");
    case "MT004":
      return fail("validation_error", `Choose a start time in the future, up to ${MEETING_MAX_DAYS_AHEAD} days ahead.`);
    case "MT005":
      return fail("validation_error", "This session doesn't use a live room.");
    case "MT006":
      return fail("validation_error", "This meeting has already started or finished, so it can't be changed that way.");
    case "MT007":
      return fail("validation_error", `The room opens ${MEETING_OPENS_MINUTES_BEFORE} minutes before the start time.`);
    case "MT008":
      return fail("validation_error", "The scheduled time for this meeting has passed.");
    case "23P01":
      return fail("validation_error", "This overlaps another session you have scheduled. Pick a different time.");
    case "P0002":
      return fail("not_found", "We couldn't find that meeting.");
    default:
      return mapDbError(error, fallback);
  }
}
