import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSelfAssessment, setSelfAssessmentRating } from "@/lib/student/ssb-journey-progress";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("self assessment", () => {
  it("stores and overwrites a rating per trait", () => {
    setSelfAssessmentRating("Initiative", 3);
    setSelfAssessmentRating("Initiative", 4);
    setSelfAssessmentRating("Stamina", 2);
    expect(readSelfAssessment()).toEqual({ Initiative: 4, Stamina: 2 });
  });

  it("treats corrupted stored data as empty", () => {
    window.localStorage.setItem("ssb-journey-self-assessment", "oops");
    expect(readSelfAssessment()).toEqual({});
  });
});
