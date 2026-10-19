// Worker configuration from the environment. Secrets are read here only and
// never logged. Model routing is per task kind so cheaper models can be tried
// per route later without code changes (PRD §12.9 cost-aware routing).

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface WorkerConfig {
  databaseUrl: string;
  workerId: string;
  pollIntervalMs: number;
  concurrency: number;
  evaluation: { model: string; effort: Effort; maxTokens: number; timeoutMs: number };
  /** The AI interviewer's next question: latency matters, so a lighter effort by default. */
  question: { model: string; effort: Effort; maxTokens: number; timeoutMs: number };
}

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

function int(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const missing = ["DATABASE_URL", "ANTHROPIC_API_KEY"].filter((k) => !env[k]);
  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(", ")} (see worker/README.md)`);
  const effort = (env.AI_EVALUATION_EFFORT ?? "medium") as Effort;
  if (!EFFORTS.includes(effort)) throw new Error(`AI_EVALUATION_EFFORT must be one of ${EFFORTS.join(", ")}`);
  const questionEffort = (env.AI_QUESTION_EFFORT ?? "low") as Effort;
  if (!EFFORTS.includes(questionEffort)) throw new Error(`AI_QUESTION_EFFORT must be one of ${EFFORTS.join(", ")}`);
  return {
    databaseUrl: env.DATABASE_URL!,
    workerId: env.WORKER_ID ?? `worker-${process.pid}`,
    pollIntervalMs: int("POLL_INTERVAL_MS", 3000, 250, 60_000),
    concurrency: int("WORKER_CONCURRENCY", 2, 1, 10),
    evaluation: {
      model: env.AI_EVALUATION_MODEL ?? "claude-opus-5-5",
      effort,
      maxTokens: int("AI_EVALUATION_MAX_TOKENS", 16000, 1024, 64000),
      timeoutMs: int("AI_REQUEST_TIMEOUT_MS", 120_000, 10_000, 600_000),
    },
    question: {
      model: env.AI_QUESTION_MODEL ?? "claude-opus-5-5",
      effort: questionEffort,
      maxTokens: int("AI_QUESTION_MAX_TOKENS", 4000, 1024, 16000),
      timeoutMs: int("AI_QUESTION_TIMEOUT_MS", 45_000, 10_000, 300_000),
    },
  };
}
