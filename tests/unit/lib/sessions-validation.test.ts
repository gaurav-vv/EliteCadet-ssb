import { describe, expect, it } from "vitest";
import { formatIstTimeRange, istToUtcIso, utcIsoToIst, validateSessionInput, validateSlot, withinAvailability } from "@/lib/server/sessions/validation";

const NOW = "2026-10-08T00:00:00.000Z";
const BATCH = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const S1 = "11111111-1111-4111-8111-111111111111";
const base = { batchId: BATCH, title: "GD practice", description: "", date: "2026-10-15", startTime: "18:30", endTime: "20:00", mode: "online", meetingUrl: "https://meet.example.com/x", location: "", forWholeBatch: true, participantIds: [] };

describe("IST ⇄ UTC", () => {
  it("converts IST wall time to UTC and back (UTC+05:30, no DST)", () => {
    expect(istToUtcIso("2026-10-15", "18:30")).toBe("2026-10-15T13:00:00.000Z");
    expect(istToUtcIso("2026-10-15", "02:00")).toBe("2026-10-14T20:30:00.000Z");
    expect(utcIsoToIst("2026-10-14T20:30:00.000Z")).toEqual({ date: "2026-10-15", time: "02:00" });
  });

  it("rejects impossible dates and times", () => {
    expect(istToUtcIso("2026-02-30", "10:00")).toBeNull();
    expect(istToUtcIso("2026-10-15", "24:00")).toBeNull();
    expect(istToUtcIso("15/10/2026", "10:00")).toBeNull();
  });

  it("formats a range in IST", () => {
    expect(formatIstTimeRange("2026-10-15T13:00:00.000Z", "2026-10-15T14:30:00.000Z")).toMatch(/6:30.*pm.*8:00.*pm IST/i);
  });
});

describe("validateSessionInput", () => {
  it("cleans a valid online session into UTC columns", () => {
    const r = validateSessionInput(base, NOW);
    expect(r).toEqual({ ok: true, value: { batch_id: BATCH, title: "GD practice", description: null, starts_at: "2026-10-15T13:00:00.000Z", ends_at: "2026-10-15T14:30:00.000Z", mode: "online", meeting_url: "https://meet.example.com/x", location: null, for_whole_batch: true, participantIds: [] } });
  });

  it("requires an https link online and a location offline", () => {
    expect(validateSessionInput({ ...base, meetingUrl: "http://x.com" }, NOW).ok).toBe(false);
    expect(validateSessionInput({ ...base, mode: "offline", location: "" }, NOW).ok).toBe(false);
    const off = validateSessionInput({ ...base, mode: "offline", location: "Hall B" }, NOW);
    expect(off.ok && off.value.meeting_url).toBe(null);
  });

  it("refuses end before start, more than 8 hours, and the past", () => {
    expect(validateSessionInput({ ...base, endTime: "18:00" }, NOW)).toMatchObject({ ok: false, errors: { endTime: expect.any(String) } });
    expect(validateSessionInput({ ...base, startTime: "08:00", endTime: "17:00" }, NOW)).toMatchObject({ ok: false, errors: { endTime: expect.any(String) } });
    expect(validateSessionInput({ ...base, date: "2026-10-01" }, NOW)).toMatchObject({ ok: false, errors: { date: expect.any(String) } });
  });

  it("needs selected students when not for the whole batch, and drops them when it is", () => {
    expect(validateSessionInput({ ...base, forWholeBatch: false }, NOW)).toMatchObject({ ok: false, errors: { participantIds: expect.any(String) } });
    expect(validateSessionInput({ ...base, forWholeBatch: false, participantIds: ["x"] }, NOW).ok).toBe(false);
    const sel = validateSessionInput({ ...base, forWholeBatch: false, participantIds: [S1, S1] }, NOW);
    expect(sel.ok && sel.value.participantIds).toEqual([S1]);
    const whole = validateSessionInput({ ...base, participantIds: [S1] }, NOW);
    expect(whole.ok && whole.value.participantIds).toEqual([]);
  });
});

describe("availability", () => {
  it("validates slots", () => {
    expect(validateSlot({ weekday: "1", startTime: "18:00", endTime: "20:00" })).toEqual({ ok: true, value: { weekday: 1, start_time: "18:00", end_time: "20:00" } });
    expect(validateSlot({ weekday: "7", startTime: "18:00", endTime: "20:00" }).ok).toBe(false);
    expect(validateSlot({ weekday: "1", startTime: "20:00", endTime: "18:00" }).ok).toBe(false);
  });

  it("checks a session against weekly IST slots", () => {
    const thursday = [{ id: "a", weekday: 4, startTime: "18:00", endTime: "21:00" }]; // 2026-10-15 is a Thursday
    expect(withinAvailability(thursday, "2026-10-15T13:00:00.000Z", "2026-10-15T14:30:00.000Z")).toBe(true);
    expect(withinAvailability(thursday, "2026-10-15T15:00:00.000Z", "2026-10-15T16:00:00.000Z")).toBe(false);
    expect(withinAvailability([], "2026-10-15T15:00:00.000Z", "2026-10-15T16:00:00.000Z")).toBe(true);
  });
});
