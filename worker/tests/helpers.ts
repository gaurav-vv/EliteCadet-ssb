import type Anthropic from "@anthropic-ai/sdk";
import type { MessagesClient } from "../src/engine/evaluate.js";
import type { Evaluation } from "../src/engine/schema.js";

export const STUDENT_ANSWER = "I organised a blood donation camp in my college with ten friends. We contacted the hospital first and planned the shifts.";

export function goodEvaluation(): Evaluation {
  return {
    dimensions: [
      { dimension: "relevance", rating: "strong", confidence: "high", evidence: ["I organised a blood donation camp"], note: "Answers the question directly with a real example." },
      { dimension: "structure", rating: "developing", confidence: "medium", evidence: ["We contacted the hospital first"], note: "Steps are in order but there is no closing point." },
      { dimension: "clarity", rating: "strong", confidence: "high", evidence: ["planned the shifts"], note: "Plain and specific wording." },
      { dimension: "specificity", rating: "developing", confidence: "medium", evidence: ["with ten friends"], note: "One concrete detail; the outcome is missing." },
    ],
    feedback: {
      observation: "You describe a real initiative you led, in order.",
      evidence: "You say you contacted the hospital first and planned the shifts.",
      impact: "Assessors look for what you did and what changed because of it.",
      improvement_action: "End with the result: how many donors came and what you learned.",
      recommended_practice: "Rewrite this answer in four sentences: situation, your action, the result, the lesson.",
    },
    overall_confidence: "medium",
  };
}

export function message(over: Partial<Anthropic.Beta.BetaMessage> & { json?: unknown } = {}): Anthropic.Beta.BetaMessage {
  const { json = goodEvaluation(), ...rest } = over;
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: typeof json === "string" ? json : JSON.stringify(json), citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 400, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
    ...rest,
  } as unknown as Anthropic.Beta.BetaMessage;
}

export function fakeClient(respond: () => Anthropic.Beta.BetaMessage | Promise<Anthropic.Beta.BetaMessage>) {
  const calls: { body: Anthropic.Beta.MessageCreateParamsNonStreaming; options?: { timeout?: number } }[] = [];
  const client: MessagesClient = {
    beta: {
      messages: {
        create: async (body, options) => {
          calls.push({ body, options });
          return respond();
        },
      },
    },
  };
  return { client, calls };
}
