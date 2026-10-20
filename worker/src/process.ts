import type { Pool } from "pg";
import { evaluate, type MessagesClient, type ModelSettings } from "./engine/evaluate.js";
import { generateQuestion, type InterviewInput } from "./engine/question.js";
import type { EvaluationItem } from "./engine/prompt.js";
import { getRubric } from "./rubrics/registry.js";
import { claimJobs, completeInterviewQuestion, completeJob, failJob, logUsage, type AiJob } from "./queue.js";

export interface RouteSettings {
  evaluation: ModelSettings;
  question: ModelSettings;
}

// One pass: claim due jobs, evaluate each, record the result. Logs carry ids
// and outcome codes only — never answer text, prompts or keys.

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

function itemsOf(job: AiJob): EvaluationItem[] | null {
  const raw = job.input.items;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 60) return null;
  const items: EvaluationItem[] = [];
  for (const it of raw) {
    if (typeof it !== "object" || it === null) return null;
    const { prompt, response } = it as Record<string, unknown>;
    if (typeof prompt !== "string" || typeof response !== "string" || prompt.length > 2000 || response.length > 5000) return null;
    items.push({ prompt, response });
  }
  // Nothing written means nothing to evaluate — not an AI failure.
  return items.some((i) => i.response.trim().length > 0) ? items : null;
}

function interviewInputOf(job: AiJob): InterviewInput | null {
  const input = job.input as unknown as InterviewInput;
  const mode = input?.session?.mode;
  if (!["guided", "topic", "mock"].includes(mode) || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > 12) return null;
  if (!input.items.every((it) => typeof it?.prompt === "string" && typeof it?.response === "string" && it.response.length <= 3000)) return null;
  return { session: { mode, topic: typeof input.session.topic === "string" ? input.session.topic : null, max_questions: Number(input.session.max_questions) || 5, context: typeof input.session.context === "object" && input.session.context !== null ? input.session.context : {} }, items: input.items };
}

async function processQuestion(pool: Pool, client: MessagesClient, job: AiJob, workerId: string, settings: ModelSettings, log: Logger): Promise<string> {
  const input = interviewInputOf(job);
  if (!input) {
    const status = await failJob(pool, job, workerId, "invalid_input", false);
    log.error("job rejected", { job: job.id, code: "invalid_input", status });
    return status;
  }
  const outcome = await generateQuestion(client, input, settings);
  await logUsage(pool, job.id, outcome.usage, outcome.ok ? "succeeded" : outcome.code);
  if (outcome.ok) {
    await completeInterviewQuestion(pool, job, workerId, outcome.question, outcome.kind, outcome.followUpType);
    log.info("question written", { job: job.id, kind: outcome.kind, followUp: outcome.followUpType, model: outcome.model });
    return "succeeded";
  }
  // Giving up ('dead') makes the database continue from the question bank.
  const status = await failJob(pool, job, workerId, outcome.code, outcome.retryable);
  log.error("question failed", { job: job.id, code: outcome.code, status, attempt: job.attempts });
  return status;
}

export async function processJob(pool: Pool, client: MessagesClient, job: AiJob, workerId: string, routes: RouteSettings, log: Logger): Promise<string> {
  if (job.kind === "interview_question") return processQuestion(pool, client, job, workerId, routes.question, log);
  const settings = routes.evaluation;
  const rubric = getRubric(job.rubric_id, job.rubric_version);
  const items = itemsOf(job);
  if (!rubric || !items) {
    const code = !rubric ? "unknown_rubric" : "invalid_input";
    const status = await failJob(pool, job, workerId, code, false);
    log.error("job rejected", { job: job.id, code, status });
    return status;
  }

  const outcome = await evaluate(client, rubric, items, settings);
  await logUsage(pool, job.id, outcome.usage, outcome.ok ? "succeeded" : outcome.code);

  if (outcome.ok) {
    await completeJob(pool, job, workerId, outcome.model, outcome.evaluation, Object.fromEntries(rubric.dimensions.map((d) => [d.id, d.name])));
    log.info("job succeeded", { job: job.id, rubric: `${rubric.id}@${rubric.version}`, model: outcome.model, attempt: job.attempts });
    return "succeeded";
  }
  const status = await failJob(pool, job, workerId, outcome.code, outcome.retryable);
  log.error("job failed", { job: job.id, code: outcome.code, retryable: outcome.retryable, status, attempt: job.attempts, violations: outcome.violations?.map((v) => (v.kind === "banned_claim" ? v.rule : v.kind)) });
  return status;
}

export async function runOnce(pool: Pool, client: MessagesClient, workerId: string, limit: number, routes: RouteSettings, log: Logger): Promise<number> {
  const jobs = await claimJobs(pool, workerId, limit);
  await Promise.all(
    jobs.map((job) =>
      processJob(pool, client, job, workerId, routes, log).catch(async (error: unknown) => {
        // A bug or database blip: release the job for a retry rather than leaving it stuck.
        log.error("job crashed", { job: job.id, error: error instanceof Error ? error.name : "unknown" });
        await failJob(pool, job, workerId, "worker_error", true).catch(() => undefined);
      }),
    ),
  );
  return jobs.length;
}
