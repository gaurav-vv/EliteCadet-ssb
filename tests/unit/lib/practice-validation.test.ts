// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cleanAnswerPatch, cleanAttemptAnswers, cleanMockReview, isClientKey, streakDays, validateItemInput } from "@/lib/server/practice/validation";

describe("answer patches", () => {
  it("keeps only valid, sent fields", () => {
    expect(cleanAnswerPatch({ text: "Hi", done: true })).toEqual({ ok: true, value: { text: "Hi", done: true } });
    expect(cleanAnswerPatch({ optionId: "oir-p-1-a" })).toEqual({ ok: true, value: { optionId: "oir-p-1-a" } });
    expect(cleanAnswerPatch({ selfReview: ["Honest"] }).ok).toBe(true);
  });
  it("rejects malformed or oversized input", () => {
    expect(cleanAnswerPatch({}).ok).toBe(false);
    expect(cleanAnswerPatch(null).ok).toBe(false);
    expect(cleanAnswerPatch({ text: "x".repeat(5001) }).ok).toBe(false);
    expect(cleanAnswerPatch({ done: "yes" }).ok).toBe(false);
    expect(cleanAnswerPatch({ optionId: "<script>" }).ok).toBe(false);
    expect(cleanAnswerPatch({ selfReview: Array(21).fill("x") }).ok).toBe(false);
  });
});

describe("attempt answers", () => {
  it("accepts bank answers by key; custom prompts only in mock runs", () => {
    expect(cleanAttemptAnswers([{ key: "tat-1", response: "A story" }], false)).toEqual([{ key: "tat-1", response: "A story", optionId: undefined }]);
    expect(cleanAttemptAnswers([{ prompt: "About Pune?", response: "Home" }], true)).toEqual([{ prompt: "About Pune?", response: "Home" }]);
    expect(cleanAttemptAnswers([{ prompt: "About Pune?", response: "Home" }], false)).toBeNull();
  });
  it("rejects empty, oversized or malformed submissions", () => {
    expect(cleanAttemptAnswers([], false)).toBeNull();
    expect(cleanAttemptAnswers(Array(201).fill({ key: "a" }), false)).toBeNull();
    expect(cleanAttemptAnswers([{ key: "bad key!" }], false)).toBeNull();
    expect(cleanAttemptAnswers([{ key: "a", response: 5 }], false)).toBeNull();
  });
  it("client keys must look like a generated id", () => {
    expect(isClientKey("2b7d9c1e-0000-4000-8000-000000000000")).toBe(true);
    expect(isClientKey("short")).toBe(false);
  });
  it("mock review is a map of string lists", () => {
    expect(cleanMockReview({ "int-1": ["Honest"] })).toEqual({ "int-1": ["Honest"] });
    expect(cleanMockReview([])).toBeNull();
    expect(cleanMockReview({ a: [1] })).toBeNull();
  });
});

describe("streak", () => {
  const NOW = "2026-10-08T06:00:00Z"; // 11:30 IST
  it("counts consecutive IST days ending today", () => {
    expect(streakDays(["2026-10-08T01:00:00Z", "2026-10-07T10:00:00Z", "2026-10-06T10:00:00Z", "2026-10-04T10:00:00Z"], NOW)).toBe(3);
  });
  it("is not broken before today's practice (counts from yesterday)", () => {
    expect(streakDays(["2026-10-07T10:00:00Z", "2026-10-06T10:00:00Z"], NOW)).toBe(2);
  });
  it("uses the IST date, and is 0 with a gap", () => {
    expect(streakDays(["2026-10-07T19:00:00Z"], NOW)).toBe(1); // 00:30 IST on 8 Oct
    expect(streakDays(["2026-10-05T10:00:00Z"], NOW)).toBe(0);
    expect(streakDays([], NOW)).toBe(0);
  });
});

describe("Super Admin item form", () => {
  it("builds MCQ options with stable ids and the chosen correct one", () => {
    const r = validateItemInput("mcq", { prompt: "2, 4, 8, ?", options: "12\n16\n\n18", correct: "2" }, "oir-x");
    expect(r).toEqual({ ok: true, value: { prompt: "2, 4, 8, ?", options: [{ id: "oir-x-a", label: "12" }, { id: "oir-x-b", label: "16" }, { id: "oir-x-c", label: "18" }], correctOptionId: "oir-x-b", guidance: null } });
  });
  it("explains each MCQ problem", () => {
    const r = validateItemInput("mcq", { prompt: "", options: "Only one", correct: "3" }, "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["correct", "options", "prompt"]);
  });
  it("free text: guidance optional, but tips need what it assesses", () => {
    expect(validateItemInput("response", { prompt: "Why the forces?" }, "k")).toEqual({ ok: true, value: { prompt: "Why the forces?", options: null, correctOptionId: null, guidance: null } });
    const g = validateItemInput("response", { prompt: "Why?", assesses: "Motivation", tips: "Be honest\nBe brief" }, "k");
    expect(g.ok && g.value.guidance).toEqual({ assesses: "Motivation", tips: ["Be honest", "Be brief"] });
    expect(validateItemInput("response", { prompt: "Why?", tips: "Be honest" }, "k").ok).toBe(false);
  });
});
