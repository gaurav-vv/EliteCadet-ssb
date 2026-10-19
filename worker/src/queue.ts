import type { Pool } from "pg";
import type { Evaluation } from "./engine/schema.js";
import type { CallUsage } from "./engine/evaluate.js";

// Thin wrappers over the SQL queue functions (0017). All state transitions
// happen inside Postgres, so two workers can never process the same job.

export interface AiJob {
  id: string;
  kind: "evaluation" | "interview_question";
  subject_type: string;
  subject_id: string;
  student_id: string;
  rubric_id: string;
  rubric_version: number;
  input: { items?: unknown; context?: unknown };
  attempts: number;
  max_attempts: number;
}

export async function claimJobs(pool: Pool, workerId: string, limit: number): Promise<AiJob[]> {
  const { rows } = await pool.query<AiJob>("select * from public.ai_claim_jobs($1, $2)", [workerId, limit]);
  return rows;
}

// Each dimension is stored with its display name, so the
// app can render an evaluation without its own copy of the rubric.
export async function completeJob(pool: Pool, job: AiJob, workerId: string, model: string, evaluation: Evaluation, names: Record<string, string>): Promise<void> {
  await pool.query("select public.ai_complete_job($1, $2, $3, $4::jsonb, $5::jsonb, $6::public.ai_confidence)", [
    job.id,
    workerId,
    model,
    JSON.stringify(evaluation.dimensions.map((d) => ({ ...d, name: names[d.dimension] ?? d.dimension }))),
    JSON.stringify(evaluation.feedback),
    evaluation.overall_confidence,
  ]);
}

export async function failJob(pool: Pool, job: AiJob, workerId: string, code: string, retryable: boolean): Promise<string> {
  const { rows } = await pool.query<{ status: string }>("select public.ai_fail_job($1, $2, $3, $4) as status", [job.id, workerId, code, retryable]);
  return rows[0]?.status ?? "unknown";
}

export async function logUsage(pool: Pool, jobId: string, usage: CallUsage[], outcome: string): Promise<void> {
  for (const u of usage) {
    await pool.query("select public.ai_log_usage($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
      jobId,
      u.model,
      u.inputTokens,
      u.outputTokens,
      u.cacheReadTokens,
      u.cacheWriteTokens,
      u.costMicroUsd,
      u.latencyMs,
      outcome,
    ]);
  }
}

export async function completeInterviewQuestion(pool: Pool, job: AiJob, workerId: string, question: string, kind: "follow_up" | "new_topic", followUpType: string | null): Promise<void> {
  await pool.query("select public.ai_complete_interview_question($1, $2, $3, $4::public.interview_turn_kind, $5::public.interview_follow_up)", [job.id, workerId, question, kind, followUpType]);
}
