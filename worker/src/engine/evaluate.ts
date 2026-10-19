import Anthropic from "@anthropic-ai/sdk";
import type { Effort } from "../config.js";
import { costMicroUsd, type TokenUsage } from "../pricing.js";
import type { Rubric } from "../rubrics/types.js";
import { checkEvaluation, type GuardrailViolation } from "./guardrails.js";
import { buildSystemPrompt, buildUserMessage, type EvaluationItem } from "./prompt.js";
import { evaluationJsonSchema, evaluationSchema, type Evaluation } from "./schema.js";

// One evaluation = one model call. Every outcome is classified so the queue
// knows whether to retry, and every call reports tokens, cost and latency.

export interface ModelSettings {
  model: string;
  effort: Effort;
  maxTokens: number;
  timeoutMs: number;
}

/** The slice of the SDK the engine uses — the real client, or a fake in tests. */
export interface MessagesClient {
  beta: { messages: { create(body: Anthropic.Beta.MessageCreateParamsNonStreaming, options?: { timeout?: number }): PromiseLike<Anthropic.Beta.BetaMessage> } };
}

export type EvaluationOutcome =
  | { ok: true; evaluation: Evaluation; model: string; usage: CallUsage[] }
  | { ok: false; code: FailureCode; retryable: boolean; usage: CallUsage[]; violations?: GuardrailViolation[] };

export type FailureCode = "rate_limited" | "overloaded" | "timeout" | "network" | "server_error" | "bad_request" | "auth" | "refusal" | "truncated" | "malformed_output" | "guardrail" | "unknown";

export interface CallUsage extends TokenUsage {
  costMicroUsd: number | null;
  latencyMs: number;
}

// Server-side refusal fallbacks: a policy decline is retried on Anthropic's
// recommended model inside the same call instead of failing the job.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

function usageFrom(message: Anthropic.Beta.BetaMessage, latencyMs: number): CallUsage[] {
  const iterations = message.usage.iterations ?? [];
  const parts: TokenUsage[] =
    iterations.length > 0
      ? iterations.map((it) => ({
          model: ("model" in it && it.model) || message.model,
          inputTokens: it.input_tokens ?? 0,
          outputTokens: ("output_tokens" in it ? it.output_tokens : 0) ?? 0,
          cacheReadTokens: it.cache_read_input_tokens ?? 0,
          cacheWriteTokens: it.cache_creation_input_tokens ?? 0,
        }))
      : [
          {
            model: message.model,
            inputTokens: message.usage.input_tokens ?? 0,
            outputTokens: message.usage.output_tokens ?? 0,
            cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
          },
        ];
  // Latency belongs to the whole call; report it once.
  return parts.map((p, i) => ({ ...p, costMicroUsd: costMicroUsd(p), latencyMs: i === parts.length - 1 ? latencyMs : 0 }));
}

function classifyError(error: unknown): { code: FailureCode; retryable: boolean } {
  if (error instanceof Anthropic.RateLimitError) return { code: "rate_limited", retryable: true };
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { code: "timeout", retryable: true };
  if (error instanceof Anthropic.APIConnectionError) return { code: "network", retryable: true };
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { code: "auth", retryable: false };
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError || error instanceof Anthropic.UnprocessableEntityError) return { code: "bad_request", retryable: false };
  if (error instanceof Anthropic.InternalServerError) return { code: error.status === 529 ? "overloaded" : "server_error", retryable: true };
  if (error instanceof Anthropic.APIError) return { code: "server_error", retryable: (error.status ?? 500) >= 500 || error.status === 408 || error.status === 409 };
  return { code: "unknown", retryable: true };
}

export async function evaluate(client: MessagesClient, rubric: Rubric, items: EvaluationItem[], settings: ModelSettings, now: () => number = Date.now): Promise<EvaluationOutcome> {
  const started = now();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages.create(
      {
        model: settings.model,
        max_tokens: settings.maxTokens,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        // Thinking stays adaptive (the model's default); effort sets its depth.
        output_config: { effort: settings.effort, format: { type: "json_schema", schema: evaluationJsonSchema(rubric) } },
        system: [{ type: "text", text: buildSystemPrompt(rubric), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildUserMessage(items) }],
      },
      { timeout: settings.timeoutMs },
    );
  } catch (error) {
    return { ok: false, ...classifyError(error), usage: [] };
  }
  const usage = usageFrom(message, now() - started);

  if (message.stop_reason === "refusal") return { ok: false, code: "refusal", retryable: false, usage };
  if (message.stop_reason === "max_tokens") return { ok: false, code: "truncated", retryable: true, usage };

  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, code: "malformed_output", retryable: true, usage };
  }
  const result = evaluationSchema(rubric).safeParse(parsed);
  if (!result.success) return { ok: false, code: "malformed_output", retryable: true, usage };
  // Each rubric dimension exactly once.
  if (new Set(result.data.dimensions.map((d) => d.dimension)).size !== rubric.dimensions.length) {
    return { ok: false, code: "malformed_output", retryable: true, usage };
  }

  const violations = checkEvaluation(result.data, items.map((i) => i.response).join("\n"));
  if (violations.length > 0) return { ok: false, code: "guardrail", retryable: true, usage, violations };

  return { ok: true, evaluation: result.data, model: message.model, usage };
}
