// Integration: lib/api/practice.ts against the real content in
// lib/mock/practice.ts — the same wiring the Practice pages use.
import { describe, expect, it } from "vitest";
import { getActivities, getActivityDetail, submitPractice } from "@/lib/api/practice";
import { PRACTICE_TIMING } from "@/lib/practice/config";
import type { PsychologyTestType } from "@/types/practice";

describe("practice API", () => {
  it("lists the four psychology activities", async () => {
    const result = await getActivities();
    expect(result.ok).toBe(true);
    expect(result.data?.map((a) => a.testType).sort()).toEqual(["sdt", "srt", "tat", "wat"]);
  });

  it("every activity's advertised item count matches its real content (no fabricated figures)", async () => {
    const { data: activities } = await getActivities();
    for (const activity of activities ?? []) {
      const detail = await getActivityDetail(activity.testType);
      expect(detail.ok, activity.testType).toBe(true);
      expect(detail.data?.items.length, activity.testType).toBe(activity.itemCount);
    }
  });

  it("every activity has unique, non-empty items and a timing config", async () => {
    const { data: activities } = await getActivities();
    for (const activity of activities ?? []) {
      const { data } = await getActivityDetail(activity.testType);
      const ids = data?.items.map((i) => i.id) ?? [];
      expect(new Set(ids).size, activity.testType).toBe(ids.length);
      expect(data?.items.every((i) => i.prompt.trim().length > 0), activity.testType).toBe(true);
      expect(PRACTICE_TIMING[activity.testType], activity.testType).toBeDefined();
    }
  });

  it("returns a friendly validation error for an unknown activity", async () => {
    const result = await getActivityDetail("xyz" as PsychologyTestType);
    expect(result.ok).toBe(false);
    expect(result.error).toEqual({ code: "validation_error", message: "That practice activity doesn't exist." });
  });

  it("rejects an empty submission", async () => {
    const result = await submitPractice({ testType: "wat", responses: [] }, "key-empty");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("validation_error");
  });

  it("returns the original result when the same submission is sent twice", async () => {
    const input = { testType: "wat" as const, responses: [{ itemId: "w1", response: "Courage wins." }] };
    const first = await submitPractice(input, "key-double-click");
    const second = await submitPractice(input, "key-double-click");
    expect(first.ok).toBe(true);
    expect(second.data).toEqual(first.data);
  });
});
