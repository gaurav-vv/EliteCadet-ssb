import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { evaluate } from "../src/engine/evaluate.js";
import { checkEvaluation } from "../src/engine/guardrails.js";
import { buildSystemPrompt } from "../src/engine/prompt.js";
import { costMicroUsd } from "../src/pricing.js";
import { GENERAL_RESPONSE_V1 } from "../src/rubrics/general-response.js";
import { fakeClient, goodEvaluation, message, STUDENT_ANSWER } from "./helpers.js";

const SETTINGS = { model: "claude-opus-5-5", effort: "medium" as const, maxTokens: 16000, timeoutMs: 120000 };
const ITEMS = [{ prompt: "Describe a time you took initiative.", response: STUDENT_ANSWER }];

describe("evaluate: request", () => {
  it("sends a cacheable rubric system prompt, structured output, effort, refusal fallback and the answer as data", async () => {
    const { client, calls } = fakeClient(() => message());
    await evaluate(client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
    const { body, options } = calls[0];
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(body.fallbacks).toBe("default");
    expect(body.output_config?.effort).toBe("medium");
    expect(body.output_config?.format?.type).toBe("json_schema");
    expect(body).not.toHaveProperty("thinking");
    const system = body.system as Anthropic.Beta.BetaTextBlockParam[];
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[0].text).not.toContain(STUDENT_ANSWER);
    expect(JSON.stringify(body.messages)).toContain("<student_response>");
    expect(options?.timeout).toBe(120000);
  });

  it("builds the identical system prompt every time (cache-stable)", () => {
    expect(buildSystemPrompt(GENERAL_RESPONSE_V1)).toBe(buildSystemPrompt(GENERAL_RESPONSE_V1));
  });
});

describe("evaluate: outcomes", () => {
  it("returns a validated evaluation with per-call cost", async () => {
    const { client } = fakeClient(() => message());
    const r = await evaluate(client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evaluation.dimensions).toHaveLength(4);
    // 1200*4 + 800*0.2 + 400*20 = 4800 + 160 + 8000 = 12960 micro-USD
    expect(r.usage[0].costMicroUsd).toBe(12960);
  });

  it("a refusal is final, a truncated answer is retried", async () => {
    const refused = await evaluate(fakeClient(() => message({ stop_reason: "refusal" })).client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
    expect(refused).toMatchObject({ ok: false, code: "refusal", retryable: false });
    const cut = await evaluate(fakeClient(() => message({ stop_reason: "max_tokens" })).client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
    expect(cut).toMatchObject({ ok: false, code: "truncated", retryable: true });
  });

  it("rejects malformed or incomplete output", async () => {
    for (const json of ["not json", { ...goodEvaluation(), dimensions: goodEvaluation().dimensions.slice(0, 3) }, { ...goodEvaluation(), overall_confidence: "certain" }]) {
      const r = await evaluate(fakeClient(() => message({ json })).client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
      expect(r).toMatchObject({ ok: false, code: "malformed_output", retryable: true });
    }
    const dup = goodEvaluation();
    dup.dimensions[1] = { ...dup.dimensions[1], dimension: "relevance" };
    expect(await evaluate(fakeClient(() => message({ json: dup })).client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS)).toMatchObject({ ok: false, code: "malformed_output" });
  });

  it("classifies API errors into retryable and final", async () => {
    const err = (status: number) => Anthropic.APIError.generate(status, { error: { message: "x" } }, "x", new Headers());
    const cases: [unknown, string, boolean][] = [
      [err(429), "rate_limited", true],
      [err(529), "overloaded", true],
      [err(500), "server_error", true],
      [err(400), "bad_request", false],
      [err(401), "auth", false],
      [new Anthropic.APIConnectionTimeoutError(), "timeout", true],
      [new Anthropic.APIConnectionError({ message: "down" }), "network", true],
    ];
    for (const [error, code, retryable] of cases) {
      const r = await evaluate(fakeClient(() => { throw error; }).client, GENERAL_RESPONSE_V1, ITEMS, SETTINGS);
      expect(r).toMatchObject({ ok: false, code, retryable });
    }
  });
});

describe("guardrails", () => {
  it("passes a grounded, safe evaluation", () => {
    expect(checkEvaluation(goodEvaluation(), STUDENT_ANSWER)).toEqual([]);
  });

  it.each([
    ["You will definitely be recommended at the SSB.", "selection_prediction"],
    ["This answer guarantees your selection.", "selection_prediction"],
    ["Your official SSB score here would be high.", "official_score"],
    ["Your SSB readiness is 83% based on this.", "single_readiness_number"],
    ["This suggests an anxiety disorder.", "clinical_claim"],
    ["Your accent makes this harder to follow.", "accent"],
  ])("blocks %s", (text, rule) => {
    const e = goodEvaluation();
    e.feedback.impact = text;
    expect(checkEvaluation(e, STUDENT_ANSWER)).toContainEqual({ kind: "banned_claim", rule, field: "feedback.impact" });
  });

  it("requires every evidence quote to come from the student's own answer", () => {
    const e = goodEvaluation();
    e.dimensions[0].evidence = ["I led a team of fifty volunteers"];
    expect(checkEvaluation(e, STUDENT_ANSWER)).toEqual([{ kind: "ungrounded_evidence", dimension: "relevance", quote: "I led a team of fifty volunteers" }]);
  });

  it("tolerates case, punctuation and quote marks in quotes, and never checks the student's own words for banned claims", () => {
    const e = goodEvaluation();
    e.dimensions[0].evidence = ["“i ORGANISED a blood-donation camp”"];
    expect(checkEvaluation(e, STUDENT_ANSWER)).toEqual([]);
    const answer = "My friends say I will be selected for sure.";
    const e2 = goodEvaluation();
    e2.dimensions.forEach((d) => (d.evidence = []));
    e2.dimensions[0].evidence = ["I will be selected for sure"];
    expect(checkEvaluation(e2, answer)).toEqual([]);
  });
});

describe("pricing", () => {
  it("prices known models and never guesses unknown ones", () => {
    expect(costMicroUsd({ model: "claude-haiku-5-5", inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBe(100_000);
    expect(costMicroUsd({ model: "some-future-model", inputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBeNull();
  });
});
