import { beforeEach, describe, expect, it, vi } from "vitest";
import { readAnswer, saveAnswerText, saveSelfReview } from "@/lib/student/practice-answers";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("practice answers", () => {
  it("returns null for an answer that was never saved", () => {
    expect(readAnswer("day-4", "personal-interview", "int-1")).toBeNull();
  });

  it("saves and reads back answer text", () => {
    saveAnswerText("day-4", "personal-interview", "int-1", "I am from Pune.");
    expect(readAnswer("day-4", "personal-interview", "int-1")?.text).toBe("I am from Pune.");
  });

  it("keeps self-review ticks when the text changes, and the text when ticks change", () => {
    saveAnswerText("day-4", "personal-interview", "int-1", "First draft");
    saveSelfReview("day-4", "personal-interview", "int-1", ["Specific example"]);
    saveAnswerText("day-4", "personal-interview", "int-1", "Second draft");
    expect(readAnswer("day-4", "personal-interview", "int-1")).toMatchObject({
      text: "Second draft",
      selfReview: ["Specific example"],
    });
  });

  it("scopes answers by day and module, not only item id", () => {
    saveAnswerText("day-4", "personal-interview", "q1", "Interview answer");
    expect(readAnswer("day-5", "conference-questions", "q1")).toBeNull();
  });

  it("treats corrupted stored data as empty", () => {
    window.localStorage.setItem("ssb-practice-answers", "{broken");
    expect(readAnswer("day-4", "personal-interview", "int-1")).toBeNull();
  });

  it("still returns the answer when storage writes are blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(saveAnswerText("day-4", "personal-interview", "int-1", "Kept").text).toBe("Kept");
  });
});
