import { describe, expect, it } from "vitest";
import { pickMockQuestions } from "@/lib/practice/mock-questions";
import type { MockSessionConfig } from "@/lib/practice/config";

const general = Array.from({ length: 12 }, (_, i) => ({ id: `int-${i + 1}`, prompt: `General ${i + 1}` }));
const piq = Array.from({ length: 6 }, (_, i) => ({ id: `piq-${i + 1}`, prompt: `PIQ ${i + 1}` }));
const interview: MockSessionConfig = { questionCount: 8, secondsPerQuestion: 120, maxPiqQuestions: 3, openingQuestionId: "int-1" };
const seeded = () => {
  let seed = 42;
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
};

describe("pickMockQuestions", () => {
  it("always opens with the configured opening question", () => {
    expect(pickMockQuestions(interview, general, piq, seeded())[0].id).toBe("int-1");
  });

  it("returns exactly questionCount questions with no repeats", () => {
    const picked = pickMockQuestions(interview, general, piq, seeded());
    expect(picked).toHaveLength(8);
    expect(new Set(picked.map((q) => q.id)).size).toBe(8);
  });

  it("uses at most maxPiqQuestions from the PIQ", () => {
    const picked = pickMockQuestions(interview, general, piq, seeded());
    expect(picked.filter((q) => q.id.startsWith("piq-"))).toHaveLength(3);
  });

  it("fills from general questions when there is no PIQ", () => {
    const picked = pickMockQuestions(interview, general, [], seeded());
    expect(picked).toHaveLength(8);
    expect(picked.every((q) => q.id.startsWith("int-"))).toBe(true);
  });

  it("returns fewer questions when the bank is smaller than questionCount", () => {
    expect(pickMockQuestions(interview, general.slice(0, 3), [], seeded())).toHaveLength(3);
  });

  it("works without an opening question (conference)", () => {
    const conference: MockSessionConfig = { questionCount: 4, secondsPerQuestion: 60, maxPiqQuestions: 0 };
    const picked = pickMockQuestions(conference, general, piq, seeded());
    expect(picked).toHaveLength(4);
    expect(picked.some((q) => q.id.startsWith("piq-"))).toBe(false);
  });

  it("is deterministic for the same random source", () => {
    const a = pickMockQuestions(interview, general, piq, seeded()).map((q) => q.id);
    const b = pickMockQuestions(interview, general, piq, seeded()).map((q) => q.id);
    expect(a).toEqual(b);
  });
});
