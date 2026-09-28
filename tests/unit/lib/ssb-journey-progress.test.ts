import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countDoneForModule,
  getProgressCounts,
  isItemDone,
  readCompletedItemKeys,
  readSelfAssessment,
  setItemDone,
  setSelfAssessmentRating,
} from "@/lib/student/ssb-journey-progress";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("journey item completion", () => {
  it("starts with nothing done", () => {
    expect(readCompletedItemKeys()).toEqual([]);
    expect(isItemDone("day-1", "oir-practice", "oir-p-1")).toBe(false);
  });

  it("marks an item done and persists it", () => {
    setItemDone("day-1", "oir-practice", "oir-p-1", true);
    expect(isItemDone("day-1", "oir-practice", "oir-p-1")).toBe(true);
  });

  it("does not duplicate an item marked done twice", () => {
    setItemDone("day-1", "oir-practice", "oir-p-1", true);
    setItemDone("day-1", "oir-practice", "oir-p-1", true);
    expect(readCompletedItemKeys()).toHaveLength(1);
  });

  it("un-marks an item", () => {
    setItemDone("day-1", "oir-practice", "oir-p-1", true);
    setItemDone("day-1", "oir-practice", "oir-p-1", false);
    expect(isItemDone("day-1", "oir-practice", "oir-p-1")).toBe(false);
  });

  it("scopes completion by day and module, not just item id", () => {
    setItemDone("day-2", "wat-practice", "item-1", true);
    expect(isItemDone("day-2", "wat-practice", "item-1")).toBe(true);
    expect(isItemDone("day-2", "srt-practice", "item-1")).toBe(false);
  });

  it("treats corrupted stored data as empty instead of throwing", () => {
    window.localStorage.setItem("ssb-journey-progress", "{not json");
    expect(readCompletedItemKeys()).toEqual([]);
  });

  it("still returns the updated list when storage writes are blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(setItemDone("day-1", "oir-practice", "oir-p-1", true)).toEqual(["day-1:oir-practice:oir-p-1"]);
  });
});

describe("progress counts", () => {
  it("counts only this module's done items", () => {
    setItemDone("day-1", "oir-practice", "a", true);
    setItemDone("day-1", "other", "b", true);
    expect(countDoneForModule("day-1", "oir-practice", ["a", "b", "c"])).toBe(1);
  });

  it("totals always equal the real item count across modules", () => {
    setItemDone("day-1", "m1", "a", true);
    setItemDone("day-2", "m2", "x", true);
    const counts = getProgressCounts([
      { dayId: "day-1", moduleId: "m1", itemIds: ["a", "b"] },
      { dayId: "day-2", moduleId: "m2", itemIds: ["x", "y", "z"] },
    ]);
    expect(counts).toEqual({ done: 2, total: 5 });
  });

  it("returns zero totals for no modules", () => {
    expect(getProgressCounts([])).toEqual({ done: 0, total: 0 });
  });
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
