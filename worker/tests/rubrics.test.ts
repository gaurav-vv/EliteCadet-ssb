import { describe, expect, it } from "vitest";
import { checkEvaluation } from "../src/engine/guardrails.js";
import { buildSystemPrompt } from "../src/engine/prompt.js";
import { evaluationSchema } from "../src/engine/schema.js";
import { getRubric, listRubrics } from "../src/rubrics/registry.js";

const CLINICAL = /\b(personality|psycholog\w*|mental|emotion\w*|trait|introvert|extrovert|anxious|confident person)\b/i;

describe("rubric registry", () => {
  it("has unique (id, version) pairs with well-formed, unique dimension ids", () => {
    const keys = listRubrics().map((r) => `${r.id}@${r.version}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of listRubrics()) {
      expect(r.id).toMatch(/^[a-z0-9-]{2,60}$/);
      const ids = r.dimensions.map((d) => d.id);
      expect(new Set(ids).size, r.id).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z_]{2,40}$/);
      expect(r.dimensions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("has the diagnostic v1 rubric the database queues (communication, situational reasoning, self-awareness)", () => {
    expect(getRubric("diagnostic", 1)?.dimensions.map((d) => d.id)).toEqual(["communication", "situational_reasoning", "self_awareness"]);
  });

  it.each(["tat", "wat", "srt", "sdt"])("has a psychology-%s v1 rubric matching the database trigger's naming", (t) => {
    expect(getRubric(`psychology-${t}`, 1)).toBeDefined();
  });

  it("psychology dimensions describe the responses, never the person", () => {
    for (const r of listRubrics().filter((x) => x.id.startsWith("psychology-"))) {
      for (const d of r.dimensions) expect(`${d.name} ${d.looksFor}`, `${r.id}.${d.id}`).not.toMatch(CLINICAL);
      expect(buildSystemPrompt(r)).toContain("never what they reveal about the student as a person");
    }
  });

  it("a psychology evaluation that names a trait or diagnosis is rejected", () => {
    const r = getRubric("psychology-srt", 1)!;
    const evaluation = evaluationSchema(r).parse({
      dimensions: r.dimensions.map((d) => ({ dimension: d.id, rating: "developing", confidence: "medium", evidence: [], note: "Some reactions stop at the first step." })),
      feedback: { observation: "o", evidence: "e", impact: "This suggests depression.", improvement_action: "a", recommended_practice: "p" },
      overall_confidence: "medium",
    });
    expect(checkEvaluation(evaluation, "anything")).toContainEqual({ kind: "banned_claim", rule: "clinical_claim", field: "feedback.impact" });
  });
});
