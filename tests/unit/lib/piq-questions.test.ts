import { describe, expect, it } from "vitest";
import { PIQ_MAX_LENGTH, buildPiqQuestions, normalisePiq, validatePiq } from "@/lib/practice/piq-questions";

describe("normalisePiq", () => {
  it("trims values and drops empty fields", () => {
    expect(normalisePiq({ hometown: "  Pune ", hobbies: "   ", sports: "" })).toEqual({ hometown: "Pune" });
  });

  it("caps each value at the max length", () => {
    expect(normalisePiq({ hobbies: "x".repeat(500) }).hobbies).toHaveLength(PIQ_MAX_LENGTH);
  });
});

describe("validatePiq", () => {
  it("rejects a PIQ with nothing filled in", () => {
    expect(validatePiq({ hometown: "  " })).toMatch(/at least one field/i);
  });

  it("accepts a PIQ with one field", () => {
    expect(validatePiq({ sports: "Cricket" })).toBeNull();
  });
});

describe("buildPiqQuestions", () => {
  it("builds no questions from an empty PIQ", () => {
    expect(buildPiqQuestions({})).toEqual([]);
  });

  it("quotes the student's own entry in every question, with guidance", () => {
    const questions = buildPiqQuestions({ sports: "Football (defender)" });
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.prompt).toContain("Football (defender)");
      expect(q.guidance?.assesses).toBeTruthy();
    }
  });

  it("gives every question a unique id", () => {
    const questions = buildPiqQuestions({
      hometown: "Pune",
      education: "B.Sc.",
      favouriteSubject: "Maths",
      sports: "Hockey",
      hobbies: "Chess",
      activities: "NCC",
      achievements: "Debate winner",
      previousAttempts: "One",
    });
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("changes a question's id when the entry it quotes changes", () => {
    const [before] = buildPiqQuestions({ hobbies: "Chess" });
    const [after] = buildPiqQuestions({ hobbies: "Painting" });
    expect(before.id).not.toBe(after.id);
  });

  it("keeps the same id for the same entry", () => {
    expect(buildPiqQuestions({ hobbies: "Chess" })[0].id).toBe(buildPiqQuestions({ hobbies: " Chess " })[0].id);
  });
});
