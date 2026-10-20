import { describe, expect, it } from "vitest";
import { cleanAnswers, unansweredCount, validateAssessmentInput, validateFeedback } from "@/lib/server/assessments/validation";
import { evaluationStatusOf } from "@/types/assessments";

const NOW = "2026-10-08T00:00:00.000Z";
const BATCH = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const base = { batchId: BATCH, title: "  SRT   set 1 ", instructions: "", category: "psychology", questions: ["Your train is late and you have an exam.", "  ", "You see an accident on the road."], maxScore: "10", dueDate: "2026-10-20" };

describe("validateAssessmentInput", () => {
  it("cleans questions (drops blanks, numbers ids) and makes the due date end of that IST day", () => {
    const r = validateAssessmentInput(base, NOW);
    expect(r.ok && r.value).toEqual({
      batch_id: BATCH,
      title: "SRT set 1",
      instructions: null,
      category: "psychology",
      questions: [{ id: "q1", prompt: "Your train is late and you have an exam." }, { id: "q2", prompt: "You see an accident on the road." }],
      max_score: 10,
      due_at: "2026-10-20T18:29:00.000Z",
    });
  });

  it("rejects no questions, short questions, bad scores, past due dates and unknown categories", () => {
    const r = validateAssessmentInput({ ...base, questions: ["hi"], maxScore: "0", dueDate: "2026-10-01", category: "astro", batchId: "x" }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["batchId", "category", "dueDate", "maxScore", "questions"]);
    expect(validateAssessmentInput({ ...base, questions: [] }, NOW).ok).toBe(false);
    expect(validateAssessmentInput({ ...base, questions: Array(21).fill("A long enough question") }, NOW).ok).toBe(false);
  });
});

describe("answers", () => {
  const qs = [{ id: "q1", prompt: "a" }, { id: "q2", prompt: "b" }];
  it("keeps one trimmed answer per real question, in order, and ignores the rest", () => {
    const answers = cleanAnswers(qs, [{ questionId: "q2", answer: "  B  " }, { questionId: "q9", answer: "x" }, { questionId: "q2", answer: "dup" }, "junk"]);
    expect(answers).toEqual([{ questionId: "q1", answer: "" }, { questionId: "q2", answer: "B" }]);
    expect(unansweredCount(answers)).toBe(1);
  });
});

describe("validateFeedback", () => {
  it("allows a partial draft but requires score, strengths and improvements to submit", () => {
    expect(validateFeedback({ strengths: "Clear structure" }, 10, false).ok).toBe(true);
    const r = validateFeedback({ comments: "ok" }, 10, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["improvementAreas", "score", "strengths"]);
  });

  it("keeps the score within 0–max with at most 2 decimals", () => {
    expect(validateFeedback({ score: "11" }, 10, false).ok).toBe(false);
    expect(validateFeedback({ score: "-1" }, 10, false).ok).toBe(false);
    expect(validateFeedback({ score: "7.255" }, 10, false).ok).toBe(false);
    expect(validateFeedback({ score: "7.5", strengths: "Good", improvementAreas: "Pace" }, 10, true)).toEqual({ ok: true, value: { score: 7.5, strengths: "Good", improvement_areas: "Pace", comments: null } });
  });
});

describe("evaluationStatusOf", () => {
  it("derives pending / in review / reviewed only for submitted attempts", () => {
    expect(evaluationStatusOf({ status: "draft", feedback: null })).toBeNull();
    expect(evaluationStatusOf({ status: "submitted", feedback: null })).toBe("pending");
    expect(evaluationStatusOf({ status: "submitted", feedback: { status: "in_review" } as never })).toBe("in_review");
    expect(evaluationStatusOf({ status: "submitted", feedback: { status: "reviewed" } as never })).toBe("reviewed");
  });
});
