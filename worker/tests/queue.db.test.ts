// Runs the worker against a real Postgres with migrations 0001–0017 applied
// (supabase/tests/run-workflow-check.sh creates one). Skipped unless
// TEST_DATABASE_URL is set; the model is a fake, so no API cost.
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runOnce, type Logger } from "../src/process.js";
import { fakeClient, goodEvaluation, message, STUDENT_ANSWER } from "./helpers.js";

const URL = process.env.TEST_DATABASE_URL;
const SETTINGS = { model: "claude-opus-5-5", effort: "medium" as const, maxTokens: 16000, timeoutMs: 120000 };
const quiet: Logger = { info: () => undefined, error: () => undefined };

describe.skipIf(!URL)("queue against Postgres", () => {
  let pool: pg.Pool;
  let student: string;
  const input = { items: [{ prompt: "Describe a time you took initiative.", response: STUDENT_ANSWER }] };
  const enqueue = async (subject: string) =>
    (await pool.query<{ id: string }>("select public.enqueue_ai_evaluation('practice_attempt', $1, $2, 'general-response', 1, $3::jsonb) as id", [subject, student, JSON.stringify(input)])).rows[0].id;
  const job = async (id: string) => (await pool.query("select * from public.ai_jobs where id = $1", [id])).rows[0];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL });
    student = (await pool.query("select id from public.profiles where role = 'student' limit 1")).rows[0].id;
  });
  afterAll(async () => pool?.end());

  it("enqueue is idempotent; a job is evaluated, stored with its label, and costed", async () => {
    const subject = crypto.randomUUID();
    const id = await enqueue(subject);
    expect(await enqueue(subject)).toBe(id);
    const { client } = fakeClient(() => message());
    expect(await runOnce(pool, client, "w1", 5, SETTINGS, quiet)).toBeGreaterThanOrEqual(1);
    expect((await job(id)).status).toBe("succeeded");
    const ev = (await pool.query("select * from public.ai_evaluations where job_id = $1", [id])).rows[0];
    expect(ev.label).toBe("AI-generated practice evaluation");
    expect(ev.dimensions).toHaveLength(4);
    expect(ev.dimensions[0].name).toBe("Relevance");
    expect(ev.feedback).toEqual(goodEvaluation().feedback);
    const usage = (await pool.query("select * from public.ai_usage where job_id = $1", [id])).rows;
    expect(usage).toHaveLength(1);
    expect(Number(usage[0].cost_micro_usd)).toBe(12960);
  });

  it("a retryable failure backs off and keeps the job; a final failure marks it dead", async () => {
    const retry = await enqueue(crypto.randomUUID());
    await runOnce(pool, fakeClient(() => message({ stop_reason: "max_tokens" })).client, "w1", 5, SETTINGS, quiet);
    const j = await job(retry);
    expect(j.status).toBe("queued");
    expect(j.last_error_code).toBe("truncated");
    expect(new Date(j.run_after).getTime()).toBeGreaterThan(Date.now() + 20_000);

    const final = await enqueue(crypto.randomUUID());
    await runOnce(pool, fakeClient(() => message({ stop_reason: "refusal" })).client, "w1", 5, SETTINGS, quiet);
    expect((await job(final)).status).toBe("dead");
  });

  it("gives up after max attempts, and never stores an evaluation that failed the guardrails", async () => {
    const id = await enqueue(crypto.randomUUID());
    const bad = goodEvaluation();
    bad.feedback.impact = "You will be selected at the SSB.";
    for (let i = 0; i < 3; i++) {
      await pool.query("update public.ai_jobs set run_after = now() where id = $1", [id]);
      await runOnce(pool, fakeClient(() => message({ json: bad })).client, "w1", 5, SETTINGS, quiet);
    }
    const j = await job(id);
    expect(j.status).toBe("dead");
    expect(j.attempts).toBe(3);
    expect(j.last_error_code).toBe("guardrail");
    expect((await pool.query("select count(*)::int as n from public.ai_evaluations where job_id = $1", [id])).rows[0].n).toBe(0);
  });

  it("two workers never take the same job, and only the holder can finish it", async () => {
    const ids = await Promise.all([1, 2, 3, 4].map(() => enqueue(crypto.randomUUID())));
    const [a, b] = await Promise.all([pool.query("select id from public.ai_claim_jobs('wa', 3)"), pool.query("select id from public.ai_claim_jobs('wb', 3)")]);
    const taken = [...a.rows, ...b.rows].map((r) => r.id).filter((id) => ids.includes(id));
    expect(new Set(taken).size).toBe(taken.length);
    const held = a.rows[0]?.id;
    if (held) await expect(pool.query("select public.ai_fail_job($1, 'wb', 'x', true)", [held])).rejects.toThrow(/not held/);
  });
});

describe.skipIf(!URL)("psychology test → AI feedback, end to end", () => {
  it("a submitted TAT test is evaluated with the TAT rubric, stored with dimension names, and the student is notified", async () => {
    const pool = new pg.Pool({ connectionString: URL });
    try {
      const student = (await pool.query("select id from public.profiles where role = 'student' limit 1")).rows[0].id;
      const item = (await pool.query("select id, prompt from public.practice_items where bank_slug = 'tat' and key = 'tat-3'")).rows[0];
      const answer = "Arjun gathers the villagers and plans how to repair the bridge before the rains.";
      const attempt = (await pool.query("insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers) values ($1, 'tat', 'test', $2, $3::jsonb) returning id", [student, `e2e-${crypto.randomUUID()}`, JSON.stringify([{ itemId: item.id, response: answer }])])).rows[0].id;
      const tat = {
        dimensions: ["perception", "central_character", "action", "outcome", "structure"].map((d) => ({ dimension: d, rating: "developing", confidence: "medium", evidence: d === "action" ? ["plans how to repair the bridge"] : [], note: "Seen in the story." })),
        feedback: goodEvaluation().feedback,
        overall_confidence: "medium",
      };
      const { client, calls } = fakeClient(() => message({ json: tat }));
      // Only this job is due now (others in this database may be backing off).
      await pool.query("update public.ai_jobs set run_after = now() + interval '1 hour' where status = 'queued' and subject_id <> $1", [attempt]);
      await runOnce(pool, client, "w-e2e", 5, SETTINGS, quiet);
      const system = JSON.stringify(calls[0].body.system);
      expect(system).toContain("psychology-tat v1");
      expect(JSON.stringify(calls[0].body.messages)).toContain(item.prompt.slice(0, 30));
      const ev = (await pool.query("select * from public.ai_evaluations where subject_id = $1", [attempt])).rows[0];
      expect(ev.rubric_id).toBe("psychology-tat");
      expect(ev.dimensions.find((d: { dimension: string }) => d.dimension === "action").name).toBe("Action toward the goal");
      const note = (await pool.query("select href from public.notifications where recipient_id = $1 and kind = 'ai_feedback_ready' and ref_id = $2", [student, ev.id])).rows[0];
      expect(note.href).toBe(`/student/practice/psychology/results/${attempt}`);
    } finally {
      await pool.end();
    }
  });
});
