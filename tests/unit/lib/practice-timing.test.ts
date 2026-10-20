// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseTiming, PRACTICE_TIMING, timingFor, timingLabel } from "@/lib/practice/config";

describe("timer overrides", () => {
  it("accepts valid carousel and budget timers", () => {
    expect(parseTiming({ mode: "carousel", stimulusSeconds: 30, responseSeconds: 240 })).toEqual({ mode: "carousel", stimulusSeconds: 30, responseSeconds: 240 });
    expect(parseTiming({ mode: "carousel", responseSeconds: 15 })).toEqual({ mode: "carousel", responseSeconds: 15 });
    expect(parseTiming({ mode: "budget", totalSeconds: 1800 })).toEqual({ mode: "budget", totalSeconds: 1800 });
  });

  it("rejects anything malformed or out of range (the standard timer is used instead)", () => {
    for (const raw of [null, "x", {}, { mode: "carousel", responseSeconds: 2 }, { mode: "carousel", responseSeconds: 15.5 }, { mode: "budget", totalSeconds: 10 }, { mode: "budget", totalSeconds: 99999 }, { mode: "carousel", responseSeconds: 60, stimulusSeconds: 500 }]) {
      expect(parseTiming(raw)).toBeNull();
    }
    expect(timingFor("srt", null)).toBe(PRACTICE_TIMING.srt);
  });

  it("describes timers in words", () => {
    expect(timingLabel(PRACTICE_TIMING.tat)).toBe("30s view + 4 min write, per picture");
    expect(timingLabel(PRACTICE_TIMING.wat)).toBe("15s per item");
    expect(timingLabel(PRACTICE_TIMING.srt)).toBe("30 min total");
  });
});
