import { z } from "zod";
import type { Rubric } from "../rubrics/types.js";

// The model's output contract. Validated twice: by the API (structured
// outputs, JSON schema below) and again here, so a bad response can never
// reach the database.

const text = (max: number) => z.string().trim().min(1).max(max);

export function evaluationSchema(rubric: Rubric) {
  const ids = rubric.dimensions.map((d) => d.id) as [string, ...string[]];
  return z.object({
    dimensions: z
      .array(
        z.object({
          dimension: z.enum(ids),
          rating: z.enum(["needs_attention", "developing", "strong"]),
          confidence: z.enum(["low", "medium", "high"]),
          evidence: z.array(text(400)).max(4),
          note: text(400),
        }),
      )
      .length(rubric.dimensions.length),
    feedback: z.object({
      observation: text(600),
      evidence: text(600),
      impact: text(600),
      improvement_action: text(600),
      recommended_practice: text(600),
    }),
    overall_confidence: z.enum(["low", "medium", "high"]),
  });
}

export type Evaluation = z.infer<ReturnType<typeof evaluationSchema>>;

/** The same contract as JSON Schema, for `output_config.format`. */
export function evaluationJsonSchema(rubric: Rubric): Record<string, unknown> {
  const str = { type: "string" };
  const level = { type: "string", enum: ["low", "medium", "high"] };
  return {
    type: "object",
    additionalProperties: false,
    required: ["dimensions", "feedback", "overall_confidence"],
    properties: {
      dimensions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["dimension", "rating", "confidence", "evidence", "note"],
          properties: {
            dimension: { type: "string", enum: rubric.dimensions.map((d) => d.id) },
            rating: { type: "string", enum: ["needs_attention", "developing", "strong"] },
            confidence: level,
            evidence: { type: "array", items: str },
            note: str,
          },
        },
      },
      feedback: {
        type: "object",
        additionalProperties: false,
        required: ["observation", "evidence", "impact", "improvement_action", "recommended_practice"],
        properties: { observation: str, evidence: str, impact: str, improvement_action: str, recommended_practice: str },
      },
      overall_confidence: level,
    },
  };
}
